import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';
import { PromptRequestItem } from '@/types/prompt';

export const dynamic = 'force-dynamic';

function cleanEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function getEmailKey(email: string): string {
  const clean = cleanEmail(email).replace(/[^a-z0-9_]/g, '_');
  return `user_sync_email_${clean}`;
}

const SETTINGS_KEY = 'prompt_requests';

// Helper to load prompt requests from Supabase settings
async function loadAllPromptRequests(): Promise<PromptRequestItem[]> {
  const client = supabaseAdmin || supabase;
  try {
    const { data, error } = await client
      .from('settings')
      .select('data')
      .eq('id', SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.data && Array.isArray(data.data)) {
      return data.data as PromptRequestItem[];
    }
  } catch (err) {
    console.error('Error loading prompt requests from Supabase:', err);
  }
  return [];
}

// Helper to save prompt requests to Supabase settings
async function saveAllPromptRequests(requests: PromptRequestItem[]): Promise<boolean> {
  const client = supabaseAdmin || supabase;
  try {
    const { error } = await client.from('settings').upsert({
      id: SETTINGS_KEY,
      data: requests,
    });
    if (error) {
      console.error('Error upserting prompt_requests in settings:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving prompt_requests:', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('general', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const { searchParams } = new URL(req.url);
    const filterEmail = cleanEmail(searchParams.get('email'));
    const filterUserId = searchParams.get('userId')?.trim();

    let allRequests = await loadAllPromptRequests();

    // If filtered by email or userId, return only matching requests
    if (filterEmail || filterUserId) {
      allRequests = allRequests.filter((r) => {
        const matchesEmail = filterEmail && cleanEmail(r.userEmail) === filterEmail;
        const matchesUser = filterUserId && r.userId === filterUserId;
        return matchesEmail || matchesUser;
      });
    }

    // Sort newest first
    allRequests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      success: true,
      requests: allRequests,
      count: allRequests.length,
    });
  } catch (err: any) {
    console.error('Error in GET /api/prompt-requests:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('sync', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);
    const action = body.action || 'create';

    const allRequests = await loadAllPromptRequests();

    if (action === 'create') {
      const { request } = body;
      if (!request || !request.requestText?.trim()) {
        return NextResponse.json(
          { success: false, error: 'requestText is required' },
          { status: 400 }
        );
      }

      const userEmail = cleanEmail(request.userEmail || request.email);
      const userId = request.userId || `user_${Date.now()}`;
      const userName = request.userName || userEmail.split('@')[0] || 'Creator';

      const newRequest: PromptRequestItem = {
        id: request.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        userEmail,
        userName,
        userAvatar: request.userAvatar || undefined,
        requestText: request.requestText.trim(),
        category: request.category || 'Photorealistic',
        aiTool: request.aiTool || 'Midjourney',
        status: 'pending',
        createdAt: request.createdAt || Date.now(),
        likesCount: 0,
      };

      // Add to front of list
      const updatedList = [newRequest, ...allRequests.filter((r) => r.id !== newRequest.id)];
      await saveAllPromptRequests(updatedList);

      // Also mirror to the user's specific cloud record if email is present
      if (userEmail) {
        const client = supabaseAdmin || supabase;
        const emailKey = getEmailKey(userEmail);
        try {
          const { data: existingRow } = await client
            .from('settings')
            .select('data')
            .eq('id', emailKey)
            .maybeSingle();

          const prevData = existingRow?.data || {};
          const prevRequests: PromptRequestItem[] = prevData.promptRequests || [];
          const mergedRequests = [newRequest, ...prevRequests.filter((r) => r.id !== newRequest.id)];

          await client.from('settings').upsert({
            id: emailKey,
            data: {
              ...prevData,
              promptRequests: mergedRequests,
              lastUpdated: new Date().toISOString(),
            },
          });
        } catch (syncErr) {
          console.warn('Warning syncing request to user record:', syncErr);
        }
      }

      return NextResponse.json({
        success: true,
        request: newRequest,
        requests: updatedList,
      });
    }

    if (action === 'fulfill') {
      const { requestId, fulfilledPrompt, adminNotes, aiTool } = body;
      if (!requestId || !fulfilledPrompt?.trim()) {
        return NextResponse.json(
          { success: false, error: 'requestId and fulfilledPrompt are required' },
          { status: 400 }
        );
      }

      let targetReq: PromptRequestItem | null = null;
      const updatedList = allRequests.map((r) => {
        if (r.id === requestId) {
          targetReq = {
            ...r,
            status: 'completed' as const,
            fulfilledPrompt: fulfilledPrompt.trim(),
            fulfilledAt: Date.now(),
            adminNotes: adminNotes?.trim() || undefined,
            aiTool: aiTool || r.aiTool || 'Midjourney',
            fulfilledBy: 'Admin',
          };
          return targetReq;
        }
        return r;
      });

      if (!targetReq) {
        return NextResponse.json(
          { success: false, error: 'Request not found' },
          { status: 404 }
        );
      }

      await saveAllPromptRequests(updatedList);

      // Mirror update to the user's private cloud record so user dashboard syncs immediately
      const targetUserEmail = cleanEmail((targetReq as PromptRequestItem).userEmail);
      if (targetUserEmail) {
        const client = supabaseAdmin || supabase;
        const emailKey = getEmailKey(targetUserEmail);
        try {
          const { data: existingRow } = await client
            .from('settings')
            .select('data')
            .eq('id', emailKey)
            .maybeSingle();

          if (existingRow?.data) {
            const prevData = existingRow.data;
            const prevRequests: PromptRequestItem[] = prevData.promptRequests || [];
            const userUpdated = prevRequests.map((r) => (r.id === requestId ? targetReq! : r));
            if (!userUpdated.some((r) => r.id === requestId)) {
              userUpdated.unshift(targetReq!);
            }

            await client.from('settings').upsert({
              id: emailKey,
              data: {
                ...prevData,
                promptRequests: userUpdated,
                lastUpdated: new Date().toISOString(),
              },
            });
          }
        } catch (syncErr) {
          console.warn('Warning syncing fulfilled request to user record:', syncErr);
        }
      }

      return NextResponse.json({
        success: true,
        request: targetReq,
        requests: updatedList,
      });
    }

    if (action === 'delete') {
      const { requestId } = body;
      if (!requestId) {
        return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
      }

      const updatedList = allRequests.filter((r) => r.id !== requestId);
      await saveAllPromptRequests(updatedList);

      return NextResponse.json({
        success: true,
        requests: updatedList,
      });
    }

    if (action === 'update_status') {
      const { requestId, status } = body;
      if (!requestId || !status) {
        return NextResponse.json({ success: false, error: 'requestId and status are required' }, { status: 400 });
      }

      const updatedList = allRequests.map((r) => (r.id === requestId ? { ...r, status } : r));
      await saveAllPromptRequests(updatedList);

      return NextResponse.json({
        success: true,
        requests: updatedList,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/prompt-requests:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    const allRequests = await loadAllPromptRequests();
    const updatedList = allRequests.filter((r) => r.id !== id);
    await saveAllPromptRequests(updatedList);
    return NextResponse.json({ success: true, requests: updatedList });
  } catch (err: any) {
    console.error('Error in DELETE /api/prompt-requests:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
