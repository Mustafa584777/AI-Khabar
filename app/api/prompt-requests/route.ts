import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'prompt_requests.json');

export interface PromptRequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  planTier?: string;
  isProUser?: boolean;
  paymentMethod?: 'plan_quota' | 'points';
  pointsUsed?: number;
  promptRequestsRemaining?: number;
  requestText: string;
  category: string;
  status: 'pending' | 'in_progress' | 'fulfilled' | 'rejected';
  createdAt: string;
  fulfilledPostId?: string;
  adminNotes?: string;
}

function readRequests(): PromptRequestItem[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading prompt_requests.json:', err);
    return [];
  }
}

function writeRequests(requests: PromptRequestItem[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing prompt_requests.json:', err);
  }
}

// GET: Return all prompt requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const requests = readRequests();

    if (userId) {
      const userRequests = requests.filter((r) => r.userId === userId);
      return NextResponse.json({ success: true, requests: userRequests });
    }

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST: Add new prompt request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userEmail,
      userAvatar,
      planTier,
      isProUser,
      paymentMethod,
      pointsUsed,
      promptRequestsRemaining,
      requestText,
      category,
    } = body;

    if (!userId || !requestText?.trim()) {
      return NextResponse.json(
        { success: false, error: 'User ID and prompt description are required' },
        { status: 400 }
      );
    }

    const requests = readRequests();
    const newRequest: PromptRequestItem = {
      id: body.id || `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      userName: userName || 'Anonymous User',
      userEmail: userEmail || '',
      userAvatar: userAvatar || '/logo.png',
      planTier: planTier || (isProUser ? 'pro' : 'free'),
      isProUser: Boolean(isProUser),
      paymentMethod: paymentMethod || (promptRequestsRemaining > 0 ? 'plan_quota' : 'points'),
      pointsUsed: pointsUsed ?? (paymentMethod === 'plan_quota' ? 0 : 10),
      promptRequestsRemaining: promptRequestsRemaining ?? 0,
      requestText: requestText.trim(),
      category: category || 'Photorealistic & Portraits',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [newRequest, ...requests];
    writeRequests(updated);

    return NextResponse.json({ success: true, request: newRequest });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create request' },
      { status: 500 }
    );
  }
}

// PATCH: Update request status or add notes / link
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, fulfilledPostId, adminNotes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const requests = readRequests();
    const index = requests.findIndex((r) => r.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (status) requests[index].status = status;
    if (fulfilledPostId !== undefined) requests[index].fulfilledPostId = fulfilledPostId;
    if (adminNotes !== undefined) requests[index].adminNotes = adminNotes;

    writeRequests(requests);
    return NextResponse.json({ success: true, request: requests[index] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update request' },
      { status: 500 }
    );
  }
}

// DELETE: Remove request
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const requests = readRequests();
    const updated = requests.filter((r) => r.id !== id);
    writeRequests(updated);

    return NextResponse.json({ success: true, message: 'Request deleted successfully' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete request' },
      { status: 500 }
    );
  }
}
