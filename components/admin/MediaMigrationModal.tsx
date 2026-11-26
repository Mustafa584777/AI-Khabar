'use client';

import React, { useMemo, useRef, useState } from 'react';
import { PromptPost } from '@/types/prompt';
import {
  X,
  UploadCloud,
  Sparkles,
  FolderOpen,
  Images,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { getPromptSlug } from '@/lib/utils';

interface MediaMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: PromptPost[];
  onRefreshData: () => Promise<void> | void;
  onPushPostsGitHub: () => Promise<void> | void;
  onDownloadPostsJson: () => Promise<void> | void;
  showToast: (msg: string) => void;
}

interface PendingAsset {
  postId: string;
  title: string;
  slug: string;
  field: 'cover' | 'slide';
  slideIndex: number;
  oldUrl: string;
  targetPath: string;
  matchKeys: string[];
}

function isBrokenOrLegacyUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  if (url.includes('cdn.jsdelivr.net/gh/')) return false;
  if (url.includes('res.cloudinary.com/')) return true;
  if (url.startsWith('/images/prompts/')) return true;
  return false;
}

function buildTargetPath(slug: string, field: 'cover' | 'slide', slideIndex: number, ext = 'jpg'): string {
  const cleanSlug = (slug || 'prompt')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96);
  const cleanExt = ext.replace(/^\./, '').toLowerCase() || 'jpg';
  return field === 'slide'
    ? `prompts/${cleanSlug}-slide-${slideIndex + 1}.${cleanExt}`
    : `prompts/${cleanSlug}.${cleanExt}`;
}

function extractMatchKeys(url: string, postId: string, slug: string, field: 'cover' | 'slide', slideIndex: number): string[] {
  const keys = new Set<string>();
  const cleanUrl = url.split('?')[0].trim();
  const baseWithExt = cleanUrl.split('/').pop()?.toLowerCase();
  const baseNoExt = baseWithExt?.replace(/\.[^.]+$/, '');
  if (baseWithExt) keys.add(baseWithExt);
  if (baseNoExt) keys.add(baseNoExt);
  if (field === 'cover') {
    keys.add(postId.toLowerCase());
    if (slug) keys.add(slug.toLowerCase());
  } else {
    keys.add(`${postId.toLowerCase()}_add_${slideIndex}`);
    keys.add(`${postId.toLowerCase()}-slide-${slideIndex + 1}`);
    if (slug) keys.add(`${slug.toLowerCase()}-slide-${slideIndex + 1}`);
  }
  return Array.from(keys);
}

async function blobToCompactBase64(blob: Blob): Promise<{ base64: string; ext: string }> {
  // Always ensure real image bytes (> 1.5KB) and skip Cloudinary's 401 1x1 GIF placeholder
  if (blob.size < 1500) {
    throw new Error('Image too small or error placeholder');
  }

  // If reasonably sized and JPEG/WEBP/PNG, read directly or normalize via canvas if large
  if (blob.size <= 450 * 1024 && /image\/(jpeg|jpg|webp|png)/i.test(blob.type)) {
    const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg';
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        resolve(res.replace(/^data:[^;]+;base64,/, ''));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { base64, ext };
  }

  // Normalize large image via canvas to keep serverless batch uploads fast
  const imgUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imgUrl;
    });
    if (img.naturalWidth < 20 || img.naturalHeight < 20) {
      throw new Error('Invalid image dimensions');
    }
    const maxDim = 1400;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return {
      base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
      ext: 'jpg',
    };
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

async function tryRecoverUrlFromBrowserCache(url: string): Promise<{ base64: string; ext: string } | null> {
  const candidates = new Set<string>([url]);
  if (url.includes('res.cloudinary.com/') && url.includes('/image/upload/')) {
    const clean = url.replace(/\/image\/upload\/[^/]+\//, '/image/upload/');
    candidates.add(clean);
    for (const w of [550, 800, 360, 250, 1200]) {
      candidates.add(clean.replace('/image/upload/', `/image/upload/f_auto,q_auto:good,w_${w},c_limit/`));
    }
  }

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        cache: 'force-cache',
        mode: 'cors',
        referrerPolicy: 'no-referrer',
      });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size >= 1500 && !blob.type.includes('gif')) {
          return await blobToCompactBase64(blob);
        }
      }
    } catch {
      // Try next candidate or canvas fallback
    }
  }

  // Fallback: try <img> element with crossOrigin="anonymous" (hits cached CORS entry if present)
  for (const candidate of [url]) {
    try {
      const result = await new Promise<{ base64: string; ext: string } | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        const timer = setTimeout(() => resolve(null), 2500);
        img.onload = () => {
          clearTimeout(timer);
          if (img.naturalWidth < 20 || img.naturalHeight < 20) {
            resolve(null);
            return;
          }
          try {
            const maxDim = 1400;
            const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve({
              base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
              ext: 'jpg',
            });
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        img.src = candidate;
      });
      if (result) return result;
    } catch {}
  }

  return null;
}

export const MediaMigrationModal: React.FC<MediaMigrationModalProps> = ({
  isOpen,
  onClose,
  posts,
  onRefreshData,
  onPushPostsGitHub,
  onDownloadPostsJson,
  showToast,
}) => {
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number; uploaded: number; skipped: number }>({
    done: 0,
    total: 0,
    uploaded: 0,
    skipped: 0,
  });

  const pendingAssets = useMemo<PendingAsset[]>(() => {
    const items: PendingAsset[] = [];
    for (const p of posts) {
      const slug = getPromptSlug(p);
      if (isBrokenOrLegacyUrl(p.imageUrl)) {
        items.push({
          postId: p.id,
          title: p.title,
          slug,
          field: 'cover',
          slideIndex: 0,
          oldUrl: p.imageUrl,
          targetPath: buildTargetPath(slug, 'cover', 0, 'jpg'),
          matchKeys: extractMatchKeys(p.imageUrl, p.id, slug, 'cover', 0),
        });
      }
      if (Array.isArray(p.additionalImages)) {
        p.additionalImages.forEach((slideUrl, idx) => {
          if (isBrokenOrLegacyUrl(slideUrl)) {
            items.push({
              postId: p.id,
              title: p.title,
              slug,
              field: 'slide',
              slideIndex: idx,
              oldUrl: slideUrl,
              targetPath: buildTargetPath(slug, 'slide', idx, 'jpg'),
              matchKeys: extractMatchKeys(slideUrl, p.id, slug, 'slide', idx),
            });
          }
        });
      }
    }
    return items;
  }, [posts]);

  const cdnReadyCount = useMemo(() => {
    return posts.filter((p) => p.imageUrl && p.imageUrl.includes('cdn.jsdelivr.net/gh/')).length;
  }, [posts]);

  if (!isOpen) return null;

  const uploadBatchItems = async (
    batch: Array<{
      postId: string;
      field: 'cover' | 'slide';
      slideIndex: number;
      path: string;
      contentBase64: string;
      oldUrl: string;
    }>
  ) => {
    const res = await fetch('/api/admin/migrate-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload_and_update_posts',
        items: batch,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Batch upload failed');
    }
    return data;
  };

  const handleAutoRecoverBrowserCache = async () => {
    if (isRunning || pendingAssets.length === 0) return;
    setIsRunning(true);
    setProgress({ done: 0, total: pendingAssets.length, uploaded: 0, skipped: 0 });
    setStatusMessage('Scanning browser cache for Cloudinary images...');

    let uploadedTotal = 0;
    let skippedTotal = 0;
    const batchBuffer: Array<{
      postId: string;
      field: 'cover' | 'slide';
      slideIndex: number;
      path: string;
      contentBase64: string;
      oldUrl: string;
    }> = [];

    try {
      for (let i = 0; i < pendingAssets.length; i++) {
        const asset = pendingAssets[i];
        setStatusMessage(`Checking cache (${i + 1}/${pendingAssets.length}): ${asset.title}`);

        const recovered = await tryRecoverUrlFromBrowserCache(asset.oldUrl);
        if (recovered) {
          batchBuffer.push({
            postId: asset.postId,
            field: asset.field,
            slideIndex: asset.slideIndex,
            path: buildTargetPath(asset.slug, asset.field, asset.slideIndex, recovered.ext),
            contentBase64: recovered.base64,
            oldUrl: asset.oldUrl,
          });
        } else {
          skippedTotal++;
        }

        if (batchBuffer.length >= 5 || (i === pendingAssets.length - 1 && batchBuffer.length > 0)) {
          const chunk = batchBuffer.splice(0, batchBuffer.length);
          setStatusMessage(`Uploading ${chunk.length} recovered images to GitHub...`);
          const res = await uploadBatchItems(chunk);
          uploadedTotal += res.uploadedCount || chunk.length;
        }

        setProgress({
          done: i + 1,
          total: pendingAssets.length,
          uploaded: uploadedTotal,
          skipped: skippedTotal,
        });
      }

      if (uploadedTotal > 0) {
        await onRefreshData();
        showToast(`Recovered & uploaded ${uploadedTotal} images to GitHub!`);
        setStatusMessage(`Completed! Uploaded ${uploadedTotal} cached images to GitHub. (${skippedTotal} were not in this browser's cache.)`);
      } else {
        setStatusMessage(
          'No disabled Cloudinary images were readable from this browser cache. Use "Bulk Upload Files / Folder" below if you have local copies or a Cloudinary export.'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Cache recovery failed');
      setStatusMessage(err?.message || 'Cache recovery encountered an error.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleBulkMatchedFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || isRunning) return;

    const files = Array.from(fileList).filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name));
    if (files.length === 0) {
      showToast('No image files found in selection');
      return;
    }

    setIsRunning(true);
    setStatusMessage(`Matching ${files.length} selected images against ${pendingAssets.length} pending prompts...`);

    const fileByKey = new Map<string, File>();
    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const baseNoExt = lowerName.replace(/\.[^.]+$/, '');
      fileByKey.set(lowerName, file);
      fileByKey.set(baseNoExt, file);
    }

    const matchedPairs: Array<{ asset: PendingAsset; file: File }> = [];
    for (const asset of pendingAssets) {
      for (const k of asset.matchKeys) {
        const found = fileByKey.get(k);
        if (found) {
          matchedPairs.push({ asset, file: found });
          break;
        }
      }
    }

    if (matchedPairs.length === 0) {
      setIsRunning(false);
      setStatusMessage(
        `Scanned ${files.length} files, but none matched pending filenames, post IDs, or slugs.`
      );
      e.target.value = '';
      return;
    }

    setProgress({ done: 0, total: matchedPairs.length, uploaded: 0, skipped: files.length - matchedPairs.length });

    let uploadedTotal = 0;
    try {
      for (let i = 0; i < matchedPairs.length; i += 5) {
        const chunkPairs = matchedPairs.slice(i, i + 5);
        setStatusMessage(
          `Uploading matched batch ${Math.floor(i / 5) + 1}/${Math.ceil(matchedPairs.length / 5)}...`
        );
        const batchItems: Array<{
          postId: string;
          field: 'cover' | 'slide';
          slideIndex: number;
          path: string;
          contentBase64: string;
          oldUrl: string;
        }> = [];

        for (const pair of chunkPairs) {
          const compact = await blobToCompactBase64(pair.file);
          batchItems.push({
            postId: pair.asset.postId,
            field: pair.asset.field,
            slideIndex: pair.asset.slideIndex,
            path: buildTargetPath(pair.asset.slug, pair.asset.field, pair.asset.slideIndex, compact.ext),
            contentBase64: compact.base64,
            oldUrl: pair.asset.oldUrl,
          });
        }

        const res = await uploadBatchItems(batchItems);
        uploadedTotal += res.uploadedCount || batchItems.length;
        setProgress({
          done: Math.min(i + chunkPairs.length, matchedPairs.length),
          total: matchedPairs.length,
          uploaded: uploadedTotal,
          skipped: files.length - matchedPairs.length,
        });
      }

      await onRefreshData();
      showToast(`Matched & uploaded ${uploadedTotal} images to GitHub!`);
      setStatusMessage(`Done! Uploaded ${uploadedTotal} matched images and updated posts.json + Firestore.`);
    } catch (err: any) {
      showToast(err?.message || 'Bulk file upload failed');
      setStatusMessage(err?.message || 'Bulk file upload failed.');
    } finally {
      setIsRunning(false);
      e.target.value = '';
    }
  };

  const handleMigrateServerLocal = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatusMessage('Migrating local server public/images/prompts files to GitHub CDN...');
    try {
      const res = await fetch('/api/admin/migrate-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate_local_public' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Local server migration failed');
      }
      await onRefreshData();
      showToast(data.message || 'Local server images migrated!');
      setStatusMessage(data.message || 'Local server images migrated successfully.');
    } catch (err: any) {
      showToast(err?.message || 'Local server migration failed');
      setStatusMessage(err?.message || 'Local server migration failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                Bulk Image Recovery & GitHub Migration
              </h3>
              <p className="text-xs text-neutral-500">
                Move legacy Cloudinary images to zeena-prompt-assets in bulk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>GitHub CDN Ready</span>
              </div>
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                {cdnReadyCount} <span className="text-xs font-semibold opacity-75">posts</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Legacy / Pending Images</span>
              </div>
              <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
                {pendingAssets.length} <span className="text-xs font-semibold opacity-75">assets</span>
              </div>
            </div>
          </div>

          {/* Option 1: Recover Cached Images from This Browser */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>1. Auto-Recover from This Browser&apos;s Cache</span>
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  If thumbnails are still visible in your Admin panel, this reads those cached images automatically and uploads them to GitHub in batches.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoRecoverBrowserCache}
                disabled={isRunning || pendingAssets.length === 0}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Auto-Recover</span>
              </button>
            </div>
          </div>

          {/* Option 2: Bulk Folder / Multi-File Auto-Match */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-emerald-500" />
                <span>2. Bulk Upload Images or Cloudinary Folder</span>
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Select multiple downloaded images (or an extracted Cloudinary backup folder). Filenames matching prompt IDs, slugs, or old image names are automatically uploaded &amp; linked.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={multiFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleBulkMatchedFiles}
              />
              <input
                ref={folderInputRef}
                type="file"
                accept="image/*"
                multiple
                {...({ webkitdirectory: '', directory: '' } as any)}
                className="hidden"
                onChange={handleBulkMatchedFiles}
              />
              <button
                type="button"
                onClick={() => multiFileInputRef.current?.click()}
                disabled={isRunning || pendingAssets.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Select Multiple Images</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isRunning || pendingAssets.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Whole Folder</span>
              </button>
              <button
                type="button"
                onClick={handleMigrateServerLocal}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Server Local Folder</span>
              </button>
            </div>
          </div>

          {/* Live Progress */}
          {(statusMessage || progress.total > 0) && (
            <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span className="truncate pr-2">{statusMessage}</span>
                {progress.total > 0 && (
                  <span className="shrink-0 font-mono">
                    {progress.done}/{progress.total}
                  </span>
                )}
              </div>
              {progress.total > 0 && (
                <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </div>
              )}
              {progress.total > 0 && (
                <div className="flex items-center gap-4 text-[11px] text-neutral-500">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Uploaded: {progress.uploaded}
                  </span>
                  <span>Unmatched / Not cached: {progress.skipped}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPushPostsGitHub}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Push posts.json to GitHub</span>
            </button>
            <button
              type="button"
              onClick={onDownloadPostsJson}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download posts.json</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
