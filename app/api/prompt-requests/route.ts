import { NextRequest, NextResponse } from 'next/server';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';
import { PromptRequestItem } from '@/types/prompt';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROMPT_REQUESTS_FILE = path.join(DATA_DIR, 'prompt_requests.json');
const SETTINGS_KEY = 'prompt_requests';

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

function cleanEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function getEmailKey(email: string): string {
  const clean = cleanEmail(email).replace(/[^a-z0-9_]/g, '_');
  return `user_sync_email_${clean}`;
}

// Helper to load prompt requests from Firestore / local file
async function loadAllPromptRequests(): Promise<PromptRequestItem[]> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'settings', SETTINGS_KEY));
      if (snap.exists() && Array.isArray(snap.data()?.data)) {
        return snap.data().data as PromptRequestItem[];
      }
    } catch (err) {
      console.error('Error loading prompt requests from Firestore:', err);
    }
  }

  try {
    ensureDataDir();
    if (fs.existsSync(PROMPT_REQUESTS_FILE)) {
      const raw = fs.readFileSync(PROMPT_REQUESTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading local prompt requests:', err);
  }

  return [];
}

// Helper to save prompt requests to Firestore and local file
async function saveAllPromptRequests(requests: PromptRequestItem[]): Promise<boolean> {
  try {
    ensureDataDir();
    fs.writeFileSync(PROMPT_REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing local prompt requests:', err);
  }

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(firestoreDb, 'settings', SETTINGS_KEY), { data: requests });
      return true;
    } catch (err) {
      console.error('Error saving prompt_requests to Firestore:', err);
      return false;
    }
  }
  return true;
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

    if (filterEmail || filterUserId) {
      allRequests = allRequests.filter((r) => {
        const matchesEmail = filterEmail && cleanEmail(r.userEmail) === filterEmail;
        const matchesUser = filterUserId && r.userId === filterUserId;
        return matchesEmail || matchesUser;
      });
    }

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
    const { action, request } = body;

    const allRequests = await loadAllPromptRequests();

    if (action === 'submit' || action === 'create') {
      if (!request || !request.requestText?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Request description is required' },
          { status: 400 }
        );
      }

      const userEmail = cleanEmail(request.userEmail);
      const newRequest: PromptRequestItem = {
        id: request.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: request.userId || 'guest',
        userEmail: userEmail || 'guest@user.local',
        userName: request.userName || (userEmail ? userEmail.split('@')[0] : 'Creator'),
        userAvatar: request.userAvatar,
        requestText: request.requestText.trim(),
        category: request.category || 'General',
        aiTool: request.aiTool || 'ChatGPT',
        status: 'pending',
        createdAt: request.createdAt || Date.now(),
        likesCount: 0,
      };

      const updatedList = [newRequest, ...allRequests.filter((r) => r.id !== newRequest.id)];
      await saveAllPromptRequests(updatedList);

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

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/prompt-requests:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
