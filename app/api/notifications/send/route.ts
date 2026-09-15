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

function to169Image(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('ar', '16:9');
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('w', '1280');
      u.searchParams.set('q', '80');
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
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

    const formattedImage = to169Image(imageUrl);
    const formattedCollage = Array.isArray(collageImages)
      ? collageImages.slice(0, 4).map((img: string) => to169Image(img))
      : [];

    const newNotification: PushNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      subtitle: subtitle?.trim() || 'Trending AI Photo Prompts',
      body: (contentBody || subtitle || '').trim(),
      category: category || 'all',
      imageUrl: formattedImage,
      collageImages: formattedCollage,
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
