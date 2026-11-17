import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { VAPID_PUBLIC_KEY } from '@/lib/push-config';
import { PushSubscriber } from '@/types/notification';

export async function GET() {
  try {
    const subscribers = await NotificationServerStore.getSubscribers();
    return NextResponse.json({
      success: true,
      subscribers,
      count: subscribers.length,
      vapidPublicKey: VAPID_PUBLIC_KEY,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interests, subscriberId, userAgent, endpoint, keys, subscription } = body;

    const subEndpoint = endpoint || subscription?.endpoint;
    const subKeys = keys || subscription?.keys;

    const sub: PushSubscriber = {
      id: subscriberId || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endpoint: subEndpoint,
      keys: subKeys,
      subscription: subscription || (subEndpoint && subKeys ? { endpoint: subEndpoint, keys: subKeys } : undefined),
      subscribedAt: new Date().toISOString(),
      interests: Array.isArray(interests) ? interests : [],
      userAgent: userAgent || 'Browser',
      lastActiveAt: new Date().toISOString(),
    };

    const { subscribers, count } = await NotificationServerStore.addOrUpdateSubscriber(sub);

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully',
      subscriber: sub,
      subscribers,
      count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to register subscription' },
      { status: 500 }
    );
  }
}

