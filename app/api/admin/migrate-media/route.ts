import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore/lite';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase-db';
import { ServerStorage } from '@/lib/server-storage';
import { isAuthorizedAdmin } from '@/lib/security';
import {
  extractCloudinaryAssetPath,
  listGitHubAssetPaths,
  resolveGitHubAssetsConfig,
  rewritePostMediaUrls,
  testGitHubAssetsConnection,
  uploadBatchToGitHubAssets,
} from '@/lib/github-assets-server';
import { PromptPost } from '@/types/prompt';
import { compactPostsForJson, hydrateCompactPosts } from '@/lib/post-normalizer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const INITIAL_FEED_FILE = path.join(DATA_DIR, 'initial-feed.json');

function extractTrackedAssetPath(url: string | undefined, owner: string, repo: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const cldPath = extractCloudinaryAssetPath(url);
  if (cldPath) return cldPath;

  const jsdPrefix = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@`;
  if (url.startsWith(jsdPrefix)) {
    const rest = url.slice(jsdPrefix.length);
    const slashIdx = rest.indexOf('/');
    if (slashIdx !== -1) {
      return rest.slice(slashIdx + 1).split('?')[0].replace(/^\/+/, '');
    }
  }

  return null;
}

function readJsonPosts(filePath: string): PromptPost[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? hydrateCompactPosts(parsed) : [];
    }
  } catch (err) {
    console.warn(`Failed to read ${filePath}:`, err);
  }
  return [];
}

function writeJsonPosts(filePath: string, posts: PromptPost[]): boolean {
  try {
    const compacted = compactPostsForJson(posts, {
      omitPublishedStatus: filePath.endsWith('initial-feed.json'),
    });
    fs.writeFileSync(filePath, JSON.stringify(compacted, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn(`Unable to write ${filePath} (expected on read-only serverless fs):`, err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cfg = resolveGitHubAssetsConfig();
    const posts = readJsonPosts(POSTS_FILE);

    const expectedSet = new Set<string>();
    const basenameMap: Record<string, string[]> = {};
    let cloudinaryUrlCount = 0;

    const addTrackedUrl = (u?: string) => {
      if (!u) return;
      if (u.includes('res.cloudinary.com/')) cloudinaryUrlCount++;
      const assetPath = extractTrackedAssetPath(u, cfg.owner, cfg.repo);
      if (!assetPath) return;

      expectedSet.add(assetPath);
      const base = assetPath.split('/').pop()?.toLowerCase();
      if (base) {
        if (!basenameMap[base]) basenameMap[base] = [];
        if (!basenameMap[base].includes(assetPath)) {
          basenameMap[base].push(assetPath);
        }
      }
    };

    for (const p of posts) {
      addTrackedUrl(p.imageUrl);
      if (Array.isArray(p.additionalImages)) {
        for (const slide of p.additionalImages) addTrackedUrl(slide);
      }
    }

    const existingInGitHub = cfg.isConfigured ? await listGitHubAssetPaths() : new Set<string>();
    const expectedPaths = Array.from(expectedSet).sort();
    const alreadyUploadedPaths = expectedPaths.filter((p) => existingInGitHub.has(p));
    const missingPaths = expectedPaths.filter((p) => !existingInGitHub.has(p));

    return NextResponse.json({
      success: true,
      github: {
        configured: cfg.isConfigured,
        owner: cfg.owner,
        repo: cfg.repo,
        branch: cfg.branch,
        cdnBaseUrl: cfg.cdnBaseUrl,
      },
      totalExpected: expectedPaths.length,
      uploadedCount: alreadyUploadedPaths.length,
      missingCount: missingPaths.length,
      totalGitHubFiles: existingInGitHub.size,
      cloudinaryUrlCount,
      expectedPaths,
      alreadyUploadedPaths,
      missingPaths,
      basenameMap,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to inspect media migration state' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'test_github') {
      const test = await testGitHubAssetsConnection();
      return NextResponse.json(test);
    }

    if (action === 'upload_batch') {
      const files = Array.isArray(body?.files) ? body.files : [];
      const overwrite = Boolean(body?.overwrite);

      if (files.length === 0) {
        return NextResponse.json({ success: false, error: 'No files provided in batch' }, { status: 400 });
      }
      if (files.length > 20) {
        return NextResponse.json({ success: false, error: 'Maximum 20 files allowed per batch' }, { status: 400 });
      }

      const validExt = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
      const sanitized: Array<{ path: string; contentBase64: string }> = [];

      for (const f of files) {
        if (!f || typeof f.path !== 'string' || typeof f.contentBase64 !== 'string') continue;
        const cleanPath = f.path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\.+/g, '');
        if (!cleanPath || !validExt.test(cleanPath)) continue;
        sanitized.push({ path: cleanPath, contentBase64: f.contentBase64 });
      }

      if (sanitized.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid image files in batch' }, { status: 400 });
      }

      const existing = overwrite ? new Set<string>() : await listGitHubAssetPaths();
      const toUpload = sanitized.filter((item) => !existing.has(item.path));
      const skipped = sanitized.filter((item) => existing.has(item.path)).map((item) => item.path);

      if (toUpload.length === 0) {
        return NextResponse.json({
          success: true,
          uploadedPaths: [],
          skippedPaths: skipped,
          cdnUrls: {},
          message: `Skipped ${skipped.length} files already present in GitHub.`,
        });
      }

      const batchRes = await uploadBatchToGitHubAssets(toUpload);
      if (!batchRes.success) {
        return NextResponse.json(
          { success: false, error: batchRes.error || 'Batch commit to GitHub failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        uploadedPaths: batchRes.uploadedPaths,
        skippedPaths: skipped,
        cdnUrls: batchRes.cdnUrls,
      });
    }

    if (action === 'rewrite_urls') {
      let postsJsonUpdated = 0;
      let initialFeedUpdated = 0;
      let firestoreUpdated = 0;

      // 1. Rewrite data/posts.json
      const localPosts = readJsonPosts(POSTS_FILE);
      if (localPosts.length > 0) {
        const nextPosts = localPosts.map((p) => {
          const res = rewritePostMediaUrls(p);
          if (res.changed) postsJsonUpdated++;
          return res.post;
        });
        if (postsJsonUpdated > 0) {
          writeJsonPosts(POSTS_FILE, nextPosts);
        }
      }

      // 2. Rewrite data/initial-feed.json
      const feedPosts = readJsonPosts(INITIAL_FEED_FILE);
      if (feedPosts.length > 0) {
        const nextFeed = feedPosts.map((p) => {
          const res = rewritePostMediaUrls(p);
          if (res.changed) initialFeedUpdated++;
          return res.post;
        });
        if (initialFeedUpdated > 0) {
          writeJsonPosts(INITIAL_FEED_FILE, nextFeed);
        }
      }

      // 3. Rewrite Firebase Firestore posts collection
      if (isFirebaseConfigured()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'posts'));
          const toUpdate: PromptPost[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as PromptPost;
            if (!data || !data.id) return;
            const res = rewritePostMediaUrls(data);
            if (res.changed) {
              toUpdate.push(res.post);
            }
          });

          const chunkSize = 250;
          for (let i = 0; i < toUpdate.length; i += chunkSize) {
            const chunk = toUpdate.slice(i, i + chunkSize);
            const batch = writeBatch(firestoreDb);
            for (const post of chunk) {
              batch.set(doc(firestoreDb, 'posts', post.id), post, { merge: true });
            }
            await batch.commit();
          }
          firestoreUpdated = toUpdate.length;
        } catch (fbErr) {
          console.error('Firestore URL migration error:', fbErr);
        }
      }

      ServerStorage.clearMemoryCache();
      try {
        revalidatePath('/');
        revalidatePath('/api/posts');
      } catch {}

      return NextResponse.json({
        success: true,
        postsJsonUpdated,
        initialFeedUpdated,
        firestoreUpdated,
        message: `Updated ${postsJsonUpdated} posts in posts.json and ${firestoreUpdated} posts in Firestore to jsDelivr CDN!`,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported migration action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Media migration failed' },
      { status: 500 }
    );
  }
}
