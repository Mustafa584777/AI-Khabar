import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let decodedId = id;
    try {
      decodedId = decodeURIComponent(id);
    } catch {}

    const post =
      (await ServerStorage.getPostById(id)) ||
      (await ServerStorage.getPostById(decodedId)) ||
      (await ServerStorage.getPostBySlug(decodedId)) ||
      (await ServerStorage.getPostBySlug(id));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let decodedId = id;
    try {
      decodedId = decodeURIComponent(id);
    } catch {}

    const body = await req.json();

    const existing =
      (await ServerStorage.getPostById(id)) ||
      (await ServerStorage.getPostById(decodedId)) ||
      (await ServerStorage.getPostBySlug(decodedId)) ||
      (await ServerStorage.getPostBySlug(id));

    const targetId = existing?.id || id;

    if (body.action === 'copy') {
      await ServerStorage.incrementCopyCount(targetId);
    } else if (body.action === 'view') {
      await ServerStorage.incrementViewCount(targetId);
    } else if (body.action === 'like') {
      await ServerStorage.toggleLike(targetId);
    }

    const updated = await ServerStorage.getPostById(targetId);
    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
