import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushNotificationItem } from '@/types/notification';
import fs from 'fs';
import path from 'path';

function saveCollageBase64(dataUrl: string, notifId: string): string | null {
  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const extension = matches[1] === 'jpeg' || matches[1] === 'jpg' ? 'jpg' : matches[1] === 'png' ? 'png' : 'webp';
    const buffer = Buffer.from(matches[2], 'base64');
    const collagesDir = path.join(process.cwd(), 'public', 'collages');
    if (!fs.existsSync(collagesDir)) {
      fs.mkdirSync(collagesDir, { recursive: true });
    }
    const filename = `collage-${notifId}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
    fs.writeFileSync(path.join(collagesDir, filename), buffer);
    return `/collages/${filename}`;
  } catch (err) {
    console.error('Failed to save collage in send route:', err);
    return null;
  }
}

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
      collageDataUrl,
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
    let finalImageUrl = imageUrl || '';

    if (collageDataUrl && typeof collageDataUrl === 'string' && collageDataUrl.startsWith('data:image/')) {
      const savedUrl = saveCollageBase64(collageDataUrl, notifId);
      if (savedUrl) {
        finalImageUrl = savedUrl;
      }
    }

    const newNotification: PushNotificationItem = {
      id: notifId,
      title: title.trim(),
      subtitle: subtitle?.trim() || 'Trending AI Photo Prompts',
      body: (contentBody || subtitle || '').trim(),
      category: category || 'all',
      imageUrl: finalImageUrl,
      collageImages: Array.isArray(collageImages) ? collageImages.filter((c: string) => c && c.trim()) : [],
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
