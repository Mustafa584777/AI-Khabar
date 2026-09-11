import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushNotificationItem } from '@/types/notification';

export async function GET() {
  try {
    const notifications = NotificationServerStore.getNotifications();
    const stats = NotificationServerStore.getStats();
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
      sendBrowserPush,
    } = body;

    if (!title || (!contentBody && !subtitle)) {
      return NextResponse.json(
        { error: 'Title and content body are required' },
        { status: 400 }
      );
    }

    const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const validCollage = Array.isArray(collageImages)
      ? collageImages.filter((u: string) => typeof u === 'string' && u.trim().length > 0).slice(0, 4)
      : [];

    // If 1 or more images are provided, route through 16:9 collage endpoint to guarantee 16:9 aspect ratio and 4-image collage strip
    const primaryImg = (imageUrl || validCollage[0] || '').trim();
    const effectiveImageUrl =
      validCollage.length > 1 || primaryImg
        ? `/api/notifications/collage?id=${notifId}`
        : '';

    const newNotification: PushNotificationItem = {
      id: notifId,
      title: title.trim(),
      subtitle: subtitle?.trim() || 'Trending AI Photo Prompts',
      body: (contentBody || subtitle || '').trim(),
      category: category || 'all',
      imageUrl: effectiveImageUrl || primaryImg,
      collageImages: validCollage.length > 0 ? validCollage : primaryImg ? [primaryImg] : [],
      url: url || '/',
      actionButtons: Array.isArray(actionButtons) ? actionButtons : [],
      sentAt: new Date().toISOString(),
      sentBy: 'admin',
      clicksCount: 0,
      read: false,
    };

    const { totalSent } = NotificationServerStore.addNotification(newNotification);

    return NextResponse.json({
      success: true,
      notification: newNotification,
      totalSent,
      message: 'Push notification queued and broadcasted successfully!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
