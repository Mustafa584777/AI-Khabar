import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushNotificationItem } from '@/types/notification';

export async function GET() {
  try {
    const notifications = await NotificationServerStore.getNotifications();
    const stats = NotificationServerStore.getStats();
    return NextResponse.json({
      success: true,
      notifications,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications from database' },
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
      id,
    } = body;

    if (!title || (!contentBody && !subtitle)) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const newNotification: PushNotificationItem = {
      id: id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      message: 'Notification saved to database successfully!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save notification to database' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      await NotificationServerStore.clearAllNotifications();
      return NextResponse.json({
        success: true,
        message: 'All notifications deleted from database successfully',
      });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Notification id is required for deletion' },
        { status: 400 }
      );
    }

    const remaining = await NotificationServerStore.deleteNotification(id);
    return NextResponse.json({
      success: true,
      remainingCount: remaining.length,
      message: `Notification ${id} deleted from database successfully`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification from database' },
      { status: 500 }
    );
  }
}
