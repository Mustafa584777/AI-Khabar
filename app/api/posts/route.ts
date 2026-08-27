import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeDrafts = searchParams.get('all') === 'true';
    const category = searchParams.get('category');
    const tool = searchParams.get('tool');
    const search = searchParams.get('search');

    let posts = await ServerStorage.getAllPosts(includeDrafts);

    if (category && category !== 'all') {
      posts = posts.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (tool && tool !== 'all') {
      posts = posts.filter((p) => p.aiTool.toLowerCase() === tool.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.promptText.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(
      { success: true, posts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.promptText) {
      return NextResponse.json(
        { error: 'Title and Prompt Text are required fields.' },
        { status: 400 }
      );
    }

    const saved = await ServerStorage.savePost(body);
    const allPosts = await ServerStorage.getAllPosts(true);

    return NextResponse.json(
      { success: true, post: saved, posts: allPosts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const deleted = await ServerStorage.deletePost(id);
    const allPosts = await ServerStorage.getAllPosts(true);
    return NextResponse.json({ success: deleted, posts: allPosts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
