import { NextRequest, NextResponse } from 'next/server';
import { sendWebPushEdge } from '@/lib/webpush-edge';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushNotificationItem } from '@/types/notification';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/lib/push-config';

export async function GET() {
  try {
    const notifications = await NotificationServerStore.getNotifications();
    const stats = await NotificationServerStore.getStats();
    return NextResponse.json(
      {
        success: true,
        notifications,
        stats,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
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
      sendBrowserPush = true,
      targetSubscriberId,
      targetEndpoint,
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

    let pushDeliveredCount = 0;
    let pushFailedCount = 0;
    const deadEndpoints: string[] = [];

    // Dispatch real Web Push to subscribed browser endpoints
    if (sendBrowserPush) {
      const allSubscribers = await NotificationServerStore.getSubscribers();

      let targetSubscribers = allSubscribers;

      if (targetEndpoint) {
        targetSubscribers = targetSubscribers.filter(
          (s) => s.endpoint === targetEndpoint || s.subscription?.endpoint === targetEndpoint
        );
      } else if (targetSubscriberId) {
        targetSubscribers = targetSubscribers.filter((s) => s.id === targetSubscriberId);
      } else if (category && category !== 'all') {
        const catLower = category.toLowerCase();
        targetSubscribers = targetSubscribers.filter((s) => {
          if (!s.interests || s.interests.length === 0) return true;
          return s.interests.some(
            (i) => i.toLowerCase().includes(catLower) || catLower.includes(i.toLowerCase())
          );
        });
      }

      // Filter subscribers with valid push endpoint and keys
      const pushTargets = targetSubscribers.filter((s) => {
        const ep = s.endpoint || s.subscription?.endpoint;
        const k = s.keys || s.subscription?.keys;
        return Boolean(ep && k?.p256dh && k?.auth);
      });

      const pushPayload = JSON.stringify({
        id: newNotification.id,
        title: newNotification.title,
        body: newNotification.body || newNotification.subtitle,
        subtitle: newNotification.subtitle,
        icon: '/logo.png',
        badge: '/logo.png',
        image: newNotification.imageUrl || newNotification.collageImages?.[0] || undefined,
        url: newNotification.url || '/',
        actionButtons: newNotification.actionButtons || [],
        category: newNotification.category,
        data: {
          url: newNotification.url || '/',
          id: newNotification.id,
          timestamp: Date.now(),
        },
      });

      const sendPromises = pushTargets.map(async (subscriber) => {
        const endpoint = subscriber.endpoint || subscriber.subscription?.endpoint;
        const keys = subscriber.keys || subscriber.subscription?.keys;

        if (!endpoint || !keys?.p256dh || !keys?.auth) return;

        const pushSub = {
          endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        };

        try {
          await sendWebPushEdge(
            pushSub,
            pushPayload,
            {
              subject: VAPID_SUBJECT,
              publicKey: VAPID_PUBLIC_KEY,
              privateKey: VAPID_PRIVATE_KEY,
            },
            {
              TTL: 60 * 60 * 24, // 24 hours
              urgency: 'high',
            }
          );
          pushDeliveredCount++;
        } catch (err: any) {
          pushFailedCount++;
          // 404 or 410 indicates endpoint expired or user revoked browser permission
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadEndpoints.push(endpoint);
          } else {
            console.warn(`WebPush delivery warning for ${endpoint.slice(0, 35)}...:`, err.message || err);
          }
        }
      });

      await Promise.allSettled(sendPromises);

      // Clean up dead/unsubscribed endpoints automatically
      if (deadEndpoints.length > 0) {
        try {
          await NotificationServerStore.removeSubscribersByEndpoints(deadEndpoints);
        } catch (pruneErr) {
          console.error('Failed to prune dead subscriptions:', pruneErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notification: newNotification,
      totalSent,
      pushDeliveredCount,
      pushFailedCount,
      deadPrunedCount: deadEndpoints.length,
      message: `Push notification queued and dispatched to ${pushDeliveredCount} device(s) successfully!`,
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
