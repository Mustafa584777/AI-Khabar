import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const posts = await ServerStorage.getAllPosts(true);
    const restored = await ServerStorage.restorePosts(posts, 'merge');
    return NextResponse.json({
      success: true,
      message: `Successfully synced and migrated ${restored.length} prompts to posts.json!`,
      count: restored.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Migration failed' }, { status: 500 });
  }
}
