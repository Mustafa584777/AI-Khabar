import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ServerStorage } from '@/lib/server-storage';
import {
  pushPostsJsonToGitHub,
  pushPublicCdnBundleToAssetsRepo,
  reconcilePostsWithGitHubAssets,
  resolveGitHubSiteRepoConfig,
} from '@/lib/github-assets-server';
import { PromptPost } from '@/types/prompt';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ClientPostUpdate extends Partial<PromptPost> {
  id: string;
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
    const deletedIds: string[] = Array.isArray(body?.deletedIds)
      ? body.deletedIds.filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
      : [];

    if (deletedIds.length > 0) {
      await ServerStorage.deletePosts(deletedIds);
    }

    const deletedSet = new Set(deletedIds);
    const serverPosts = await ServerStorage.getFirebasePosts();

    // Merge client overrides (supports both compact metadata updates & full new/modified PromptPost objects)
    const clientUpdates = Array.isArray(body?.postUpdates)
      ? (body.postUpdates as ClientPostUpdate[])
      : [];

    let mergedPosts: PromptPost[] = serverPosts.filter((p) => p && !deletedSet.has(p.id));
    if (clientUpdates.length > 0) {
      const serverById = new Map<string, PromptPost>();
      for (const p of mergedPosts) {
        if (p?.id) serverById.set(p.id, p);
      }

      const seenClientIds = new Set<string>();
      const nextMerged: PromptPost[] = mergedPosts.map((post) => {
        const u = clientUpdates.find((item) => item && item.id === post.id);
        if (!u) return post;
        seenClientIds.add(post.id);
        const serverTs = getVersionTs(post);
        const clientTs = getVersionTs(u);
        const hasSha = (url?: string) => Boolean(url && /@[a-f0-9]{40}\//i.test(url));
        const shouldTakeClient =
          clientTs > serverTs ||
          (clientTs === serverTs && hasSha(u.imageUrl) && !hasSha(post.imageUrl));
        if (!shouldTakeClient) return post;

        const nextStatus = u.status || post.status;
        const mergedItem: PromptPost = {
          ...post,
          ...u,
          id: post.id,
          title: u.title || post.title,
          slug: u.slug || post.slug,
          imageUrl: u.imageUrl || post.imageUrl,
          imageAlt: u.imageAlt ?? post.imageAlt,
          imageFileName: u.imageFileName ?? post.imageFileName,
          additionalImages: Array.isArray(u.additionalImages)
            ? u.additionalImages
            : post.additionalImages,
          status: nextStatus,
          isPremium: u.isPremium ?? post.isPremium,
          isNoIndex: u.isNoIndex ?? post.isNoIndex,
          updatedAt: u.updatedAt || post.updatedAt,
        };
        if (nextStatus !== 'trash') {
          delete mergedItem.deletedAt;
          delete mergedItem.previousStatus;
        }
        return mergedItem;
      });

      // Insert any brand-new client posts missing from server cache (e.g. cold serverless instance)
      for (const u of clientUpdates) {
        if (!u?.id || deletedSet.has(u.id) || seenClientIds.has(u.id) || serverById.has(u.id)) {
          continue;
        }
        if (u.title && u.promptText) {
          nextMerged.unshift(u as PromptPost);
        }
      }

      mergedPosts = nextMerged;
    }

    // Reconcile any orphaned/legacy image URLs against actual files uploaded in zeena-prompt-assets
    const { posts: reconciledPosts, healedCount } = await reconcilePostsWithGitHubAssets(mergedPosts);
    const finalPosts = ServerStorage.applyReconciledPosts(reconciledPosts, { writeLocalJson: true });

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

    const [categories, tags, settings, topQueries] = await Promise.all([
      ServerStorage.getAllCategories().catch(() => []),
      ServerStorage.getAllTags().catch(() => []),
      ServerStorage.getSettings().catch(() => undefined),
      ServerStorage.getTopSearchQueries(12).catch(() => []),
    ]);

    const [result, cdnResult] = await Promise.all([
      pushPostsJsonToGitHub(finalPosts, commitMessage, extraFiles),
      pushPublicCdnBundleToAssetsRepo(
        finalPosts,
        {
          categories,
          tags,
          settings,
          searchQueries: Array.isArray(topQueries) ? topQueries.map((q) => q.query).filter(Boolean) : [],
        },
        commitMessage
      ).catch((err) => ({
        success: false,
        commitSha: undefined,
        repo: 'Mustafa584777/zeena-prompt-assets',
        branch: 'main',
        publishedCount: 0,
        error: err?.message || 'CDN sync skipped',
      })),
    ]);

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
        cdnSynced: Boolean(cdnResult?.success),
        cdnCommitSha: cdnResult?.commitSha,
        posts: finalPosts,
        message:
          healedCount > 0
            ? `Pushed ${result.count} prompts & linked ${healedCount} GitHub image${healedCount === 1 ? '' : 's'} to ${result.repo}${cdnResult?.success ? ' + jsDelivr CDN' : ''}!`
            : `Pushed ${result.count} prompts to ${result.repo} (${result.branch})${cdnResult?.success ? ' + jsDelivr CDN' : ''}!`,
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
