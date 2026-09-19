import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushNotificationItem } from '@/types/notification';

export async function GET() {
  try {
    const notifications = await NotificationServerStore.getNotifications();
    const stats = await NotificationServerStore.getStats();
    return NextResponse.json({
      success: true,
      notifications,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      body: contentBody,
      subtitle,
      category,
      imageUrl,
      collageImages,
      url,
      actionButtons,
    } = body;

    if (!title || (!contentBody && !subtitle)) {
      return NextResponse.json(
        { error: 'Title and content body are required' },
        { status: 400 }
      );
    }

    const newNotification: PushNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      subtitle: subtitle?.trim() || 'Trending AI Photo Prompts',
      body: (contentBody || subtitle || '').trim(),
      category: category || 'all',
      imageUrl: imageUrl || '',
      collageImages: Array.isArray(collageImages) ? collageImages.slice(0, 4) : [],
      url: url || '/',
      actionButtons: Array.isArray(actionButtons) ? actionButtons : [],
      sentAt: new Date().toISOString(),
      sentBy: 'admin',
      clicksCount: 0,
      read: false,
    };

    const { totalSent } = await NotificationServerStore.addNotification(newNotification);

    return NextResponse.json({
      success: true,
      notification: newNotification,
      totalSent,
      message: 'Push notification queued and saved in Supabase successfully!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      await NotificationServerStore.clearNotifications();
      return NextResponse.json({ success: true, message: 'All notifications cleared' });
    }

    if (id) {
      await NotificationServerStore.deleteNotification(id);
      return NextResponse.json({ success: true, message: 'Notification deleted' });
    }

    return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { notifications } = body;
    if (Array.isArray(notifications)) {
      await NotificationServerStore.saveNotifications(notifications);
      return NextResponse.json({ success: true, message: 'Notifications saved successfully in Supabase' });
    }
    return NextResponse.json({ error: 'Invalid notifications array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
