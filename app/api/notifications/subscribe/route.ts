import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushSubscriber } from '@/types/notification';

export async function GET() {
  try {
    const subscribers = NotificationServerStore.getSubscribers();
    return NextResponse.json({
      success: true,
      subscribers,
      count: subscribers.length,
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
    const {
      subscriberId,
      interests = [],
      endpoint,
      userAgent,
      auth,
      p256dh,
    } = body;

    const userAgentHeader = req.headers.get('user-agent') || userAgent || 'Browser Device';

    const sub: PushSubscriber = {
      id: subscriberId || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      endpoint: endpoint || undefined,
      subscribedAt: new Date().toISOString(),
      interests: Array.isArray(interests) ? interests : [],
      userAgent: userAgentHeader.slice(0, 150),
      lastActiveAt: new Date().toISOString(),
    };

    const { subscribers, count } = NotificationServerStore.addOrUpdateSubscriber(sub);

    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully',
      count,
      subscriber: sub,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to register subscription' },
      { status: 500 }
    );
  }
}
