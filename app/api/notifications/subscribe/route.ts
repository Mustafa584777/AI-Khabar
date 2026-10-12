import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';

export async function GET() {
  try {
    const subscribers = await NotificationServerStore.getSubscribers();
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
    const { interests, subscriberId, userAgent, endpoint } = body;

    const sub = {
      id: subscriberId || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endpoint,
      subscribedAt: new Date().toISOString(),
      interests: Array.isArray(interests) ? interests : [],
      userAgent: userAgent || 'Browser',
      lastActiveAt: new Date().toISOString(),
    };

    const { subscribers, count } = await NotificationServerStore.addOrUpdateSubscriber(sub);

    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully in Supabase',
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
