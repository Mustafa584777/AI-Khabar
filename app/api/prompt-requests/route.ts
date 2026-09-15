import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('settings')
      .select('id, data')
      .like('id', 'req_%');

    if (error) {
      throw error;
    }

    const requests = (data || []).map(row => ({
      id: row.id,
      ...row.data
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    console.error('Failed to fetch prompt requests:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('post_action', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);

    const client = supabaseAdmin || supabase;
    
    if (body.action === 'update_status') {
      const { id, status } = body;
      if (!id || !status) {
        return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });
      }

      // Fetch existing
      const { data: existing, error: fetchErr } = await client
        .from('settings')
        .select('data')
        .eq('id', id)
        .single();
        
      if (fetchErr || !existing) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }

      const updatedData = { ...existing.data, status };

      const { error: updateErr } = await client
        .from('settings')
        .update({ data: updatedData })
        .eq('id', id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, updated: updatedData });
    }

    // Otherwise, create new request
    const { userId, userName, userAvatar, userEmail, requestText, category } = body;
    
    if (!requestText) {
      return NextResponse.json({ success: false, error: 'Request text is required' }, { status: 400 });
    }

    const newReqId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    const requestData = {
      userId,
      userName,
      userAvatar,
      userEmail,
      requestText,
      category: category || 'General',
      status: 'pending',
      createdAt: Date.now(),
      likesCount: 0
    };

    const { error } = await client
      .from('settings')
      .insert({
        id: newReqId,
        data: requestData
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, request: { id: newReqId, ...requestData } });
  } catch (err: any) {
    console.error('Failed to create/update prompt request:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
