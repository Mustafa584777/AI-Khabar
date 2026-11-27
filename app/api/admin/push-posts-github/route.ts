import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ServerStorage } from '@/lib/server-storage';
import {
  pushPostsJsonToGitHub,
  reconcilePostsWithGitHubAssets,
  resolveGitHubSiteRepoConfig,
} from '@/lib/github-assets-server';
import { PromptPost } from '@/types/prompt';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CompactPostUpdate {
  id: string;
  slug?: string;
  title?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageFileName?: string;
  additionalImages?: string[];
  status?: 'published' | 'draft';
  isPremium?: boolean;
  isNoIndex?: boolean;
  updatedAt?: string;
}

function getVersionTs(p?: { updatedAt?: string; publishedAt?: string; createdAt?: string } | null): number {
  if (!p) return 0;
  const t = new Date(p.updatedAt || p.publishedAt || p.createdAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

export async function GET() {
  const cfg = resolveGitHubSiteRepoConfig();
  return NextResponse.json({
    configured: cfg.isConfigured,
    owner: cfg.owner,
    repo: cfg.repo,
    branch: cfg.branch,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const serverPosts = await ServerStorage.getFirebasePosts();

    // Merge optional compact client overrides sent from Admin PostsManager
    const clientUpdates = Array.isArray(body?.postUpdates)
      ? (body.postUpdates as CompactPostUpdate[])
      : [];

    let mergedPosts: PromptPost[] = serverPosts;
    if (clientUpdates.length > 0) {
      const updateById = new Map<string, CompactPostUpdate>();
      for (const u of clientUpdates) {
        if (u && u.id) updateById.set(u.id, u);
      }
      mergedPosts = serverPosts.map((post) => {
        const u = updateById.get(post.id);
        if (!u) return post;
        const serverTs = getVersionTs(post);
        const clientTs = getVersionTs(u);
        const hasSha = (url?: string) => Boolean(url && /@[a-f0-9]{40}\//i.test(url));
        const shouldTakeClient =
          clientTs > serverTs ||
          (clientTs === serverTs && hasSha(u.imageUrl) && !hasSha(post.imageUrl));
        if (!shouldTakeClient) return post;
        return {
          ...post,
          title: u.title || post.title,
          slug: u.slug || post.slug,
          imageUrl: u.imageUrl || post.imageUrl,
          imageAlt: u.imageAlt ?? post.imageAlt,
          imageFileName: u.imageFileName ?? post.imageFileName,
          additionalImages: Array.isArray(u.additionalImages)
            ? u.additionalImages
            : post.additionalImages,
          status: u.status || post.status,
          isPremium: u.isPremium ?? post.isPremium,
          isNoIndex: u.isNoIndex ?? post.isNoIndex,
          updatedAt: u.updatedAt || post.updatedAt,
        };
      });
    }

    // Reconcile any orphaned/legacy image URLs against actual files uploaded in zeena-prompt-assets
    const { posts: reconciledPosts, healedCount } = await reconcilePostsWithGitHubAssets(mergedPosts);
    const finalPosts = ServerStorage.applyReconciledPosts(reconciledPosts);

    const extraFiles: Array<{ path: string; content: string }> = [];
    try {
      const redirectsPath = path.join(process.cwd(), 'data', 'media-redirects.json');
      if (fs.existsSync(redirectsPath)) {
        const content = fs.readFileSync(redirectsPath, 'utf-8');
        if (content && content.trim().length > 2) {
          extraFiles.push({ path: 'data/media-redirects.json', content });
        }
      }
    } catch {}

    const commitMessage =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : healedCount > 0
          ? `Update data/posts.json (${finalPosts.length} prompts, linked ${healedCount} GitHub images)`
          : undefined;

    const result = await pushPostsJsonToGitHub(finalPosts, commitMessage, extraFiles);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to push posts.json to GitHub',
          repo: result.repo,
          branch: result.branch,
        },
        { status: 500 }
      );
    }

    try {
      revalidatePath('/');
      revalidatePath('/api/posts');
    } catch {}

    return NextResponse.json(
      {
        success: true,
        commitSha: result.commitSha,
        repo: result.repo,
        branch: result.branch,
        count: result.count,
        healedCount,
        posts: finalPosts,
        message:
          healedCount > 0
            ? `Pushed ${result.count} prompts & linked ${healedCount} GitHub image${healedCount === 1 ? '' : 's'} to ${result.repo}!`
            : `Pushed ${result.count} prompts to ${result.repo} (${result.branch})!`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to push posts.json to GitHub' },
      { status: 500 }
    );
  }
}
