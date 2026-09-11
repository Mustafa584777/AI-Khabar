import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';
import { AppNotification } from '@/types/prompt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notifications = await ServerStorage.getAllNotifications();
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, category, imageUrl, targetUrl, targetPostId, sentBy } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Notification title and message are required' },
        { status: 400 }
      );
    }

    const newNotification: AppNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      message: message.trim(),
      category: category || 'all',
      imageUrl: imageUrl || '',
      targetUrl: targetUrl || '/',
      targetPostId: targetPostId || '',
      createdAt: Date.now(),
      read: false,
      sentBy: sentBy || 'Admin',
    };

    const saved = await ServerStorage.saveNotification(newNotification);
    return NextResponse.json({ success: true, notification: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    if (id === 'all') {
      await ServerStorage.clearAllNotifications();
      return NextResponse.json({ success: true, message: 'All notifications cleared' });
    }

    const success = await ServerStorage.deleteNotification(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
