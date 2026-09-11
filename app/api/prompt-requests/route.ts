import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';
import { PromptRequestItem } from '@/types/prompt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const userRequests = await ServerStorage.getPromptRequestsByUserId(userId);
      return NextResponse.json({ success: true, requests: userRequests });
    }

    const allRequests = await ServerStorage.getAllPromptRequests();
    return NextResponse.json({ success: true, requests: allRequests });
  } catch (error: any) {
    console.error('Error fetching prompt requests:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userEmail,
      userAvatar,
      userPlanTier,
      requestText,
      category,
      aiToolPreference,
      aspectRatio,
      referenceImageUrl,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User must be signed in to submit a prompt request' }, { status: 401 });
    }

    if (!requestText || !requestText.trim()) {
      return NextResponse.json({ error: 'Prompt request description is required' }, { status: 400 });
    }

    const newRequest: PromptRequestItem = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      userName: userName || 'Anonymous User',
      userEmail: userEmail || undefined,
      userAvatar: userAvatar || undefined,
      userPlanTier: userPlanTier || 'free',
      requestText: requestText.trim(),
      category: category || 'General',
      aiToolPreference: aiToolPreference || 'Midjourney v6.1',
      aspectRatio: aspectRatio || '16:9',
      referenceImageUrl: referenceImageUrl || undefined,
      status: 'pending',
      createdAt: Date.now(),
      likesCount: 0,
    };

    const saved = await ServerStorage.savePromptRequest(newRequest);
    return NextResponse.json({ success: true, request: saved });
  } catch (error: any) {
    console.error('Error creating prompt request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create prompt request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      status,
      fulfilledPrompt,
      fulfilledImageUrl,
      fulfilledAiTool,
      fulfilledNotes,
      adminNotes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const updates: Partial<PromptRequestItem> = {};
    if (status) updates.status = status;
    if (fulfilledPrompt !== undefined) updates.fulfilledPrompt = fulfilledPrompt;
    if (fulfilledImageUrl !== undefined) updates.fulfilledImageUrl = fulfilledImageUrl;
    if (fulfilledAiTool !== undefined) updates.fulfilledAiTool = fulfilledAiTool;
    if (fulfilledNotes !== undefined) updates.fulfilledNotes = fulfilledNotes;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    if (status === 'fulfilled' || (fulfilledPrompt && fulfilledPrompt.trim().length > 0)) {
      updates.status = 'fulfilled';
      updates.fulfilledAt = Date.now();
    }

    const updated = await ServerStorage.updatePromptRequest(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Prompt request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    console.error('Error updating prompt request:', error);
    return NextResponse.json({ error: error.message || 'Failed to update request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const success = await ServerStorage.deletePromptRequest(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error deleting prompt request:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete request' }, { status: 500 });
  }
}
