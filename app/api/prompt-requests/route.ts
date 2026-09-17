import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export async function GET() {
  try {
    const requests = await ServerStorage.getAllPromptRequests();
    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (err: any) {
    console.error('API /api/prompt-requests GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch prompt requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.requestText || typeof body.requestText !== 'string' || !body.requestText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Request description is required' },
        { status: 400 }
      );
    }

    const saved = await ServerStorage.savePromptRequest({
      userId: body.userId,
      userName: body.userName,
      userEmail: body.userEmail,
      userAvatar: body.userAvatar,
      requestText: body.requestText.trim(),
      category: body.category,
      aiTool: body.aiTool,
      status: body.status || 'pending',
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Prompt request submitted successfully!',
    });
  } catch (err: any) {
    console.error('API /api/prompt-requests POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit prompt request' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, fulfilledPostId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const updated = await ServerStorage.updatePromptRequestStatus(id, status, fulfilledPostId);
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Prompt request updated successfully!',
    });
  } catch (err: any) {
    console.error('API /api/prompt-requests PATCH error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update prompt request' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const updated = await ServerStorage.deletePromptRequest(id);
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Prompt request deleted successfully!',
    });
  } catch (err: any) {
    console.error('API /api/prompt-requests DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete prompt request' },
      { status: 500 }
    );
  }
}
