import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const result = await ServerStorage.syncDatabaseToLocalPosts();

    try {
      revalidatePath('/');
      revalidatePath('/api/posts');
    } catch {}

    return NextResponse.json({
      success: true,
      count: result.count,
      posts: result.posts,
      message: `Successfully synchronized and merged ${result.count} prompts from Firebase into posts.json!`,
    });
  } catch (error: any) {
    console.error('Error syncing database to local posts.json:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync posts to posts.json' },
      { status: 500 }
    );
  }
}
