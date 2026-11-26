import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
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
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn(`Failed to read ${filePath}:`, err);
  }
  return [];
}

function writeJsonPosts(filePath: string, posts: PromptPost[]): boolean {
  try {
    fs.writeFileSync(filePath, JSON.stringify(posts, null, 2), 'utf-8');
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

function cleanForFirestore<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return null as any;
  if (Array.isArray(obj)) return obj.map((item) => cleanForFirestore(item)) as any;
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res as any;
  }
  return obj;
}

function writeInitialFeedFromPosts(posts: PromptPost[]): boolean {
  const feed = posts
    .filter((p) => p && p.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0).getTime() -
        new Date(a.publishedAt || a.createdAt || 0).getTime()
    )
    .slice(0, 16);
  return writeJsonPosts(INITIAL_FEED_FILE, feed);
}

const MEDIA_REDIRECTS_FILE = path.join(DATA_DIR, 'media-redirects.json');

function saveMediaRedirects(pairs: Array<[string, string]>) {
  if (pairs.length === 0) return;
  try {
    let existing: Record<string, string> = {};
    if (fs.existsSync(MEDIA_REDIRECTS_FILE)) {
      existing = JSON.parse(fs.readFileSync(MEDIA_REDIRECTS_FILE, 'utf-8') || '{}');
    }
    for (const [fromUrl, toUrl] of pairs) {
      if (!fromUrl || !toUrl || fromUrl === toUrl) continue;
      existing[fromUrl] = toUrl;
      const cleanFrom = fromUrl.split('?')[0].trim();
      if (cleanFrom) existing[cleanFrom] = toUrl;
      const cldPath = extractCloudinaryAssetPath(fromUrl);
      if (cldPath) existing[cldPath] = toUrl;
    }
    fs.writeFileSync(MEDIA_REDIRECTS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Media redirects write notice:', err);
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

    if (action === 'upload_and_update_posts') {
      const items = Array.isArray(body?.items) ? body.items : [];
      if (items.length === 0) {
        return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 });
      }
      if (items.length > 20) {
        return NextResponse.json({ success: false, error: 'Maximum 20 items allowed per batch' }, { status: 400 });
      }

      const validExt = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
      const cleanItems: Array<{
        postId: string;
        field: 'cover' | 'slide';
        slideIndex: number;
        path: string;
        contentBase64: string;
        oldUrl?: string;
      }> = [];

      for (const item of items) {
        if (!item || typeof item.postId !== 'string' || typeof item.path !== 'string' || typeof item.contentBase64 !== 'string') {
          continue;
        }
        const cleanPath = item.path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\.+/g, '');
        if (!cleanPath || !validExt.test(cleanPath)) continue;
        cleanItems.push({
          postId: item.postId,
          field: item.field === 'slide' ? 'slide' : 'cover',
          slideIndex: typeof item.slideIndex === 'number' ? item.slideIndex : 0,
          path: cleanPath,
          contentBase64: item.contentBase64,
          oldUrl: typeof item.oldUrl === 'string' ? item.oldUrl : undefined,
        });
      }

      if (cleanItems.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid image items in batch' }, { status: 400 });
      }

      const batchRes = await uploadBatchToGitHubAssets(
        cleanItems.map((i) => ({ path: i.path, contentBase64: i.contentBase64 }))
      );

      if (!batchRes.success) {
        return NextResponse.json(
          { success: false, error: batchRes.error || 'GitHub batch upload failed' },
          { status: 500 }
        );
      }

      const updatesByPost = new Map<string, Array<{ field: 'cover' | 'slide'; slideIndex: number; newUrl: string; oldUrl?: string }>>();
      const redirectPairs: Array<[string, string]> = [];

      for (const item of cleanItems) {
        const newUrl = batchRes.cdnUrls[item.path];
        if (!newUrl) continue;
        if (item.oldUrl) redirectPairs.push([item.oldUrl, newUrl]);
        const list = updatesByPost.get(item.postId) || [];
        list.push({ field: item.field, slideIndex: item.slideIndex, newUrl, oldUrl: item.oldUrl });
        updatesByPost.set(item.postId, list);
      }

      const localPosts = readJsonPosts(POSTS_FILE);
      const updatedLocalMap = new Map<string, PromptPost>();
      let postsJsonUpdated = 0;

      const nextLocalPosts = localPosts.map((p) => {
        const patches = updatesByPost.get(p.id);
        if (!patches) return p;
        const nextPost = { ...p, additionalImages: [...(p.additionalImages || [])], updatedAt: new Date().toISOString() };
        for (const patch of patches) {
          if (patch.field === 'cover') {
            if (nextPost.imageUrl) redirectPairs.push([nextPost.imageUrl, patch.newUrl]);
            nextPost.imageUrl = patch.newUrl;
          } else if (patch.slideIndex >= 0 && patch.slideIndex < nextPost.additionalImages.length) {
            if (nextPost.additionalImages[patch.slideIndex]) {
              redirectPairs.push([nextPost.additionalImages[patch.slideIndex], patch.newUrl]);
            }
            nextPost.additionalImages[patch.slideIndex] = patch.newUrl;
          }
        }
        postsJsonUpdated++;
        updatedLocalMap.set(p.id, nextPost);
        return nextPost;
      });

      if (postsJsonUpdated > 0) {
        writeJsonPosts(POSTS_FILE, nextLocalPosts);
        writeInitialFeedFromPosts(nextLocalPosts);
      }

      let firestoreUpdated = 0;
      if (isFirebaseConfigured() && updatesByPost.size > 0) {
        try {
          const allFb = await ServerStorage.getFirebasePosts();
          const fbToWrite: PromptPost[] = [];
          for (const p of allFb) {
            const patches = updatesByPost.get(p.id);
            if (!patches) continue;
            const nextPost = { ...p, additionalImages: [...(p.additionalImages || [])], updatedAt: new Date().toISOString() };
            for (const patch of patches) {
              if (patch.field === 'cover') {
                if (nextPost.imageUrl) redirectPairs.push([nextPost.imageUrl, patch.newUrl]);
                nextPost.imageUrl = patch.newUrl;
              } else if (patch.slideIndex >= 0 && patch.slideIndex < nextPost.additionalImages.length) {
                if (nextPost.additionalImages[patch.slideIndex]) {
                  redirectPairs.push([nextPost.additionalImages[patch.slideIndex], patch.newUrl]);
                }
                nextPost.additionalImages[patch.slideIndex] = patch.newUrl;
              }
            }
            fbToWrite.push(nextPost);
            updatedLocalMap.set(p.id, nextPost);
          }

          if (fbToWrite.length > 0) {
            const batch = writeBatch(firestoreDb);
            for (const post of fbToWrite) {
              batch.set(doc(firestoreDb, 'posts', post.id), cleanForFirestore(post), { merge: true });
            }
            await batch.commit();
            firestoreUpdated = fbToWrite.length;
          }
        } catch (fbErr) {
          console.error('Firestore batch update notice:', fbErr);
        }
      }

      saveMediaRedirects(redirectPairs);
      ServerStorage.clearMemoryCache();

      try {
        revalidatePath('/');
        revalidatePath('/api/posts');
      } catch {}

      return NextResponse.json({
        success: true,
        uploadedCount: batchRes.uploadedPaths.length,
        postsJsonUpdated,
        firestoreUpdated,
        cdnUrls: batchRes.cdnUrls,
        updatedPosts: Array.from(updatedLocalMap.values()),
      });
    }

    if (action === 'migrate_local_public') {
      const localPromptsDir = path.join(process.cwd(), 'public', 'images', 'prompts');
      if (!fs.existsSync(localPromptsDir)) {
        return NextResponse.json({ success: true, migratedCount: 0, message: 'No local public/images/prompts folder found.' });
      }

      const files = fs.readdirSync(localPromptsDir).filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f));
      if (files.length === 0) {
        return NextResponse.json({ success: true, migratedCount: 0, message: 'No local image files to migrate.' });
      }

      const allPosts = isFirebaseConfigured()
        ? await ServerStorage.getFirebasePosts()
        : readJsonPosts(POSTS_FILE);
      const postById = new Map(allPosts.map((p) => [p.id, p]));

      const pendingUploads: Array<{
        postId: string;
        field: 'cover' | 'slide';
        slideIndex: number;
        path: string;
        contentBase64: string;
        oldUrl?: string;
      }> = [];

      for (const fileName of files) {
        const ext = path.extname(fileName).toLowerCase() || '.jpg';
        const base = fileName.replace(/\.[^.]+$/, '');
        const isSlide = base.includes('_add_');
        const postId = isSlide ? base.split('_add_')[0] : base;
        const slideIndex = isSlide ? Number(base.split('_add_')[1]) : 0;

        const post = postById.get(postId);
        if (!post) continue;

        const currentUrl = isSlide ? (post.additionalImages || [])[slideIndex] : post.imageUrl;
        if (currentUrl && currentUrl.includes('cdn.jsdelivr.net')) continue;

        const slugBase = (post.slug || post.id)
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 100);
        const targetPath = isSlide
          ? `prompts/${slugBase}-slide-${slideIndex + 1}${ext}`
          : `prompts/${slugBase}${ext}`;

        const absPath = path.join(localPromptsDir, fileName);
        const base64 = fs.readFileSync(absPath).toString('base64');

        pendingUploads.push({
          postId: post.id,
          field: isSlide ? 'slide' : 'cover',
          slideIndex,
          path: targetPath,
          contentBase64: base64,
          oldUrl: currentUrl,
        });
      }

      if (pendingUploads.length === 0) {
        return NextResponse.json({
          success: true,
          migratedCount: 0,
          message: 'All matching local public images are already on GitHub CDN.',
        });
      }

      const allCdnUrls: Record<string, string> = {};
      const patchesByPost = new Map<string, Array<{ field: 'cover' | 'slide'; slideIndex: number; newUrl: string; oldUrl?: string }>>();
      const redirectPairs: Array<[string, string]> = [];

      // Upload in clean batches of 15
      for (let i = 0; i < pendingUploads.length; i += 15) {
        const chunk = pendingUploads.slice(i, i + 15);
        const res = await uploadBatchToGitHubAssets(
          chunk.map((c) => ({ path: c.path, contentBase64: c.contentBase64 }))
        );
        if (!res.success) {
          return NextResponse.json(
            { success: false, error: res.error || `Local upload batch failed at offset ${i}` },
            { status: 500 }
          );
        }
        for (const item of chunk) {
          const cdnUrl = res.cdnUrls[item.path];
          if (!cdnUrl) continue;
          allCdnUrls[item.path] = cdnUrl;
          if (item.oldUrl) redirectPairs.push([item.oldUrl, cdnUrl]);
          const arr = patchesByPost.get(item.postId) || [];
          arr.push({ field: item.field, slideIndex: item.slideIndex, newUrl: cdnUrl, oldUrl: item.oldUrl });
          patchesByPost.set(item.postId, arr);
        }
      }

      const localPosts = readJsonPosts(POSTS_FILE);
      let postsJsonUpdated = 0;
      const nextLocalPosts = localPosts.map((p) => {
        const patches = patchesByPost.get(p.id);
        if (!patches) return p;
        const nextPost = { ...p, additionalImages: [...(p.additionalImages || [])], updatedAt: new Date().toISOString() };
        for (const patch of patches) {
          if (patch.field === 'cover') nextPost.imageUrl = patch.newUrl;
          else if (patch.slideIndex >= 0 && patch.slideIndex < nextPost.additionalImages.length) {
            nextPost.additionalImages[patch.slideIndex] = patch.newUrl;
          }
        }
        postsJsonUpdated++;
        return nextPost;
      });

      if (postsJsonUpdated > 0) {
        writeJsonPosts(POSTS_FILE, nextLocalPosts);
        writeInitialFeedFromPosts(nextLocalPosts);
      }

      let firestoreUpdated = 0;
      if (isFirebaseConfigured() && patchesByPost.size > 0) {
        const toWrite: PromptPost[] = [];
        for (const p of allPosts) {
          const patches = patchesByPost.get(p.id);
          if (!patches) continue;
          const nextPost = { ...p, additionalImages: [...(p.additionalImages || [])], updatedAt: new Date().toISOString() };
          for (const patch of patches) {
            if (patch.field === 'cover') nextPost.imageUrl = patch.newUrl;
            else if (patch.slideIndex >= 0 && patch.slideIndex < nextPost.additionalImages.length) {
              nextPost.additionalImages[patch.slideIndex] = patch.newUrl;
            }
          }
          toWrite.push(nextPost);
        }

        for (let i = 0; i < toWrite.length; i += 250) {
          const chunk = toWrite.slice(i, i + 250);
          const batch = writeBatch(firestoreDb);
          for (const post of chunk) {
            batch.set(doc(firestoreDb, 'posts', post.id), cleanForFirestore(post), { merge: true });
          }
          await batch.commit();
        }
        firestoreUpdated = toWrite.length;
      }

      saveMediaRedirects(redirectPairs);
      ServerStorage.clearMemoryCache();

      try {
        revalidatePath('/');
        revalidatePath('/api/posts');
      } catch {}

      return NextResponse.json({
        success: true,
        migratedCount: Object.keys(allCdnUrls).length,
        postsJsonUpdated,
        firestoreUpdated,
        message: `Migrated ${Object.keys(allCdnUrls).length} local images to GitHub CDN (${firestoreUpdated} posts updated)!`,
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
              batch.set(doc(firestoreDb, 'posts', post.id), cleanForFirestore(post), { merge: true });
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
