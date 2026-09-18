import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { isCategoryMatchingInterest } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');
    const interestsParam = searchParams.get('interests');
    let allNotifications = NotificationServerStore.getNotifications();

    if (interestsParam) {
      const userInterests = decodeURIComponent(interestsParam)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (userInterests.length > 0) {
        allNotifications = allNotifications.filter((n) =>
          isCategoryMatchingInterest(n.category, userInterests)
        );
      }
    }

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
