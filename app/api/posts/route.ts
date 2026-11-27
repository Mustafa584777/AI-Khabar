import { ServerStorage } from '@/lib/server-storage';
import { pushPostsJsonToGitHub } from '@/lib/github-assets-server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPromptSlug } from '@/lib/utils';
import fs from 'fs';
import path from 'path';
import type { PromptPost } from '@/types/prompt';

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
    const hasCacheBust = searchParams.has('t');
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
          'Cache-Control':
            fromFirebase || hasCacheBust
              ? 'no-store, no-cache, must-revalidate, max-age=0'
              : 'public, s-maxage=15, stale-while-revalidate=30',
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
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const shouldPushGitHub = body.pushToGitHub === true;

    // Batch Trash or Restore action
    if (body?.action === 'trash' || body?.action === 'restore') {
      const ids: string[] = Array.isArray(body.ids)
        ? body.ids.filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
        : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: 'Post IDs are required.' }, { status: 400 });
      }

      const idSet = new Set(ids);
      const now = new Date().toISOString();
      const currentAll = await ServerStorage.getFirebasePosts();
      const updatesToSave: PromptPost[] = [];

      for (const p of currentAll) {
        if (!p || !idSet.has(p.id)) continue;
        if (body.action === 'trash') {
          updatesToSave.push({
            ...p,
            previousStatus: p.status !== 'trash' ? p.status : (p.previousStatus || 'published'),
            status: 'trash',
            deletedAt: now,
            updatedAt: now,
          });
        } else {
          const restoredStatus = p.previousStatus === 'draft' ? 'draft' : 'published';
          const copy: PromptPost = {
            ...p,
            status: restoredStatus,
            publishedAt: restoredStatus === 'published' ? p.publishedAt || now : p.publishedAt,
            updatedAt: now,
          };
          delete copy.deletedAt;
          delete copy.previousStatus;
          updatesToSave.push(copy);
        }
      }

      // Also apply any client-provided fallback objects if post wasn't found in server cache yet
      if (Array.isArray(body.posts) && updatesToSave.length < ids.length) {
        const alreadyUpdated = new Set(updatesToSave.map((u) => u.id));
        for (const cp of body.posts) {
          if (!cp?.id || !idSet.has(cp.id) || alreadyUpdated.has(cp.id)) continue;
          if (body.action === 'trash') {
            updatesToSave.push({
              ...cp,
              previousStatus: cp.status !== 'trash' ? cp.status : (cp.previousStatus || 'published'),
              status: 'trash',
              deletedAt: now,
              updatedAt: now,
            });
          } else {
            const restoredStatus = cp.previousStatus === 'draft' ? 'draft' : 'published';
            const copy = {
              ...cp,
              status: restoredStatus,
              publishedAt: restoredStatus === 'published' ? cp.publishedAt || now : cp.publishedAt,
              updatedAt: now,
            };
            delete copy.deletedAt;
            delete copy.previousStatus;
            updatesToSave.push(copy);
          }
        }
      }

      const mergedAfterBatch = await ServerStorage.savePostsBatch(updatesToSave);
      const adminPosts = ServerStorage.applyReconciledPosts(mergedAfterBatch, {
        writeLocalJson: shouldPushGitHub,
      });

      const githubSync = shouldPushGitHub
        ? await pushPostsJsonToGitHub(
            adminPosts,
            `Update posts.json: ${body.action === 'trash' ? 'trashed' : 'restored'} ${updatesToSave.length} prompt(s)`,
            getExtraSyncFiles()
          )
        : { success: false, skipped: true };

      try {
        revalidatePath('/');
        revalidatePath('/api/posts');
      } catch {}

      return NextResponse.json(
        { success: true, posts: adminPosts, updatedIds: updatesToSave.map((u) => u.id), githubSync },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    if (!body.title || !body.promptText) {
      return NextResponse.json(
        { error: 'Title and Prompt Text are required fields.' },
        { status: 400 }
      );
    }

    const saved = await ServerStorage.savePost(body, token);
    const fetchedPosts = await ServerStorage.getFirebasePosts();

    // Ensure the just-saved post unconditionally overrides any stale copy by ID or slug
    const savedSlug = getPromptSlug(saved);
    const filtered = fetchedPosts.filter(
      (p) => p && p.id !== saved.id && getPromptSlug(p) !== savedSlug
    );
    const adminPosts = ServerStorage.applyReconciledPosts([saved, ...filtered], {
      writeLocalJson: shouldPushGitHub,
    });

    // Only push posts.json to GitHub when explicitly requested (manual "Push posts.json to GitHub" button)
    const githubSync = shouldPushGitHub
      ? await pushPostsJsonToGitHub(
          adminPosts,
          `Update posts.json: ${saved.title.slice(0, 60)}`,
          getExtraSyncFiles()
        )
      : { success: false, skipped: true };

    try {
      revalidatePath('/');
      revalidatePath('/api/posts');
      if (savedSlug) revalidatePath(`/${savedSlug}`);
    } catch {}

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
    let shouldPushGitHub = searchParams.get('pushToGitHub') === 'true';

    let idsToDelete: string[] = [];
    if (id) {
      idsToDelete.push(id);
    }
    if (idsParam) {
      idsParam.split(',').map((s) => s.trim()).filter(Boolean).forEach((i) => {
        if (!idsToDelete.includes(i)) idsToDelete.push(i);
      });
    }

    try {
      const body = await req.json();
      if (body?.pushToGitHub === true) {
        shouldPushGitHub = true;
      }
      if (idsToDelete.length === 0) {
        if (Array.isArray(body.ids)) {
          body.ids.filter(Boolean).forEach((i: string) => {
            if (!idsToDelete.includes(i)) idsToDelete.push(i);
          });
        } else if (body.id) {
          idsToDelete.push(body.id);
        }
      }
    } catch {}

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Post ID or IDs are required' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    await ServerStorage.deletePosts(idsToDelete, token);
    const idSet = new Set(idsToDelete);
    const adminPosts = ServerStorage.applyReconciledPosts(
      (await ServerStorage.getFirebasePosts()).filter((p) => p && !idSet.has(p.id)),
      { writeLocalJson: shouldPushGitHub }
    );

    const githubSync = shouldPushGitHub
      ? await pushPostsJsonToGitHub(
          adminPosts,
          `Update posts.json: permanently removed ${idsToDelete.length} prompt(s)`,
          getExtraSyncFiles()
        )
      : { success: false, skipped: true };

    try {
      revalidatePath('/');
      revalidatePath('/api/posts');
    } catch {}

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
