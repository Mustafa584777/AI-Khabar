import { NextRequest, NextResponse } from 'next/server';
import { NotificationServerStore } from '@/lib/notification-storage';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const result = await NotificationServerStore.syncFromFirestore();

    try {
      revalidatePath('/notifications');
      revalidatePath('/api/notifications/send');
      revalidatePath('/api/notifications/latest');
    } catch {}

    return NextResponse.json({
      success: true,
      count: result.count,
      notifications: result.items,
      message: `Successfully synchronized and merged ${result.count} notifications into data/notifications.json!`,
    });
  } catch (error: any) {
    console.error('Error syncing notifications to notifications.json:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync notifications to notifications.json' },
      { status: 500 }
    );
  }
}
