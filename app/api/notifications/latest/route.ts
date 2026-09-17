import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const deleted = NotificationServerStore.deleteNotification(id);
    if (deleted) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');
    const allNotifications = NotificationServerStore.getNotifications();

    if (!since) {
      return NextResponse.json({
        success: true,
        notifications: allNotifications.slice(0, 10),
        timestamp: Date.now(),
      });
    }

    const sinceTime = parseInt(since, 10) || new Date(since).getTime() || 0;
    const newItems = allNotifications.filter((n) => {
      const itemTime = new Date(n.sentAt).getTime();
      return itemTime > sinceTime;
    });

    return NextResponse.json({
      success: true,
      notifications: newItems,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch latest notifications' },
      { status: 500 }
    );
  }
}
