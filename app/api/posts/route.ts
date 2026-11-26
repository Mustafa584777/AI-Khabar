import { ServerStorage } from '@/lib/server-storage';
import { pushPostsJsonToGitHub } from '@/lib/github-assets-server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getExtraSyncFiles(): Array<{ path: string; content: string }> {
  const extra: Array<{ path: string; content: string }> = [];
  try {
    const redirectsPath = path.join(process.cwd(), 'data', 'media-redirects.json');
    if (fs.existsSync(redirectsPath)) {
      const content = fs.readFileSync(redirectsPath, 'utf-8');
      if (content && content.trim().length > 2) {
        extra.push({ path: 'data/media-redirects.json', content });
      }
    }
  } catch {}
  return extra;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromFirebase = searchParams.get('source') === 'firebase' || searchParams.get('admin') === 'true';
    const includeDrafts = fromFirebase || searchParams.get('all') === 'true';
    const category = searchParams.get('category');
    const tool = searchParams.get('tool');
    const search = searchParams.get('search');

    let posts = await ServerStorage.getAllPosts(includeDrafts, fromFirebase);

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
          'Cache-Control': fromFirebase
            ? 'no-store, no-cache, must-revalidate, max-age=0'
            : 'public, s-maxage=60, stale-while-revalidate=120',
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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const saved = await ServerStorage.savePost(body, token);
    const adminPosts = await ServerStorage.getFirebasePosts();

    const skipGitHubPush = body.skipGitHubPush === true;
    const githubSync = skipGitHubPush
      ? { success: false, skipped: true }
      : await pushPostsJsonToGitHub(
          adminPosts,
          `Update posts.json: ${saved.title.slice(0, 60)}`,
          getExtraSyncFiles()
        );

    return NextResponse.json(
      { success: true, post: saved, posts: adminPosts, githubSync },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
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
    const idsParam = searchParams.get('ids');

    let idsToDelete: string[] = [];
    if (id) {
      idsToDelete.push(id);
    }
    if (idsParam) {
      idsParam.split(',').map((s) => s.trim()).filter(Boolean).forEach((i) => {
        if (!idsToDelete.includes(i)) idsToDelete.push(i);
      });
    }

    if (idsToDelete.length === 0) {
      try {
        const body = await req.json();
        if (Array.isArray(body.ids)) {
          body.ids.filter(Boolean).forEach((i: string) => {
            if (!idsToDelete.includes(i)) idsToDelete.push(i);
          });
        } else if (body.id) {
          idsToDelete.push(body.id);
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Post ID or IDs are required' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    await ServerStorage.deletePosts(idsToDelete, token);
    const adminPosts = await ServerStorage.getFirebasePosts();

    const githubSync = await pushPostsJsonToGitHub(
      adminPosts,
      `Update posts.json: removed ${idsToDelete.length} prompt(s)`,
      getExtraSyncFiles()
    );

    return NextResponse.json(
      { success: true, posts: adminPosts, deletedIds: idsToDelete, githubSync },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
