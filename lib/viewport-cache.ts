'use client';

import { getOptimizedImageUrl } from '@/lib/utils';
import { PromptPost } from '@/types/prompt';

const warmedImageUrls = new Set<string>();
const decodedImageUrls = new Set<string>();
// Retain active references to decoded Image objects so Chromium/WebKit keeps bitmaps hot in memory (LRU)
const decodedImageRefs = new Map<string, HTMLImageElement>();
const decodedImageDimensions = new Map<string, { width: number; height: number }>();
const MAX_DECODED_IMAGE_REFS = 250;
const VIEWPORT_CACHE_NAME = 'zeenaprompt-viewport-images-v1';
const PROMPT_DETAIL_CACHE_KEY = 'auraprompt_prompt_detail_cache_v1';
const cachedPromptPostsMemory = new Map<string, PromptPost>();
let pendingStorageWrites = new Map<string, PromptPost>();
let storageFlushTimer: ReturnType<typeof setTimeout> | null = null;
let modalChunkPromise: Promise<unknown> | null = null;

function retainDecodedImageRef(url: string, img: HTMLImageElement): void {
  if (!url || !img) return;
  if (decodedImageRefs.has(url)) {
    decodedImageRefs.delete(url);
  } else if (decodedImageRefs.size >= MAX_DECODED_IMAGE_REFS) {
    const oldestKey = decodedImageRefs.keys().next().value;
    if (oldestKey) {
      decodedImageRefs.delete(oldestKey);
    }
  }
  decodedImageRefs.set(url, img);
}

function recordDimensionsFromElement(url: string, img: HTMLImageElement | null): void {
  if (!url || !img || !img.naturalWidth || !img.naturalHeight) return;
  decodedImageUrls.add(url);
  decodedImageDimensions.set(url, {
    width: img.naturalWidth,
    height: img.naturalHeight,
  });
}

/**
 * Registers an already-loaded DOM <img> element into the in-memory decoded registry
 * so opened prompt cards know both load readiness and exact natural dimensions at 0ms.
 */
export function recordLoadedImageElement(
  rawUrl: string | undefined | null,
  width: number,
  img: HTMLImageElement | null
): void {
  if (typeof window === 'undefined' || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) {
    const targetUrl = getOptimizedImageUrl(rawUrl.trim(), width);
    recordDimensionsFromElement(targetUrl, img);
    retainDecodedImageRef(targetUrl, img);
  }
  if (img.currentSrc) {
    recordDimensionsFromElement(img.currentSrc, img);
    retainDecodedImageRef(img.currentSrc, img);
  }
}

/**
 * Returns the exact natural aspect ratio ("W / H") synchronously if any resolution
 * of the given image URL has already decoded in browser memory.
 */
export function getCachedImageAspectRatio(rawUrl: string | undefined | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const candidateWidths = [800, 360, 420, 280];
  for (const w of candidateWidths) {
    const candidate = getOptimizedImageUrl(trimmed, w);
    const dims = decodedImageDimensions.get(candidate);
    if (dims && dims.width > 0 && dims.height > 0) {
      return `${dims.width} / ${dims.height}`;
    }
    const refImg = decodedImageRefs.get(candidate);
    if (refImg && refImg.complete && refImg.naturalWidth > 0 && refImg.naturalHeight > 0) {
      recordDimensionsFromElement(candidate, refImg);
      return `${refImg.naturalWidth} / ${refImg.naturalHeight}`;
    }
  }

  const rawDims = decodedImageDimensions.get(trimmed);
  if (rawDims && rawDims.width > 0 && rawDims.height > 0) {
    return `${rawDims.width} / ${rawDims.height}`;
  }
  return null;
}

/**
 * Returns true if the given image URL (at target width) has already finished
 * loading/decoding into the user's browser memory cache.
 */
export function isImageUrlCachedInMemory(rawUrl: string | undefined | null, width = 800): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  const targetUrl = getOptimizedImageUrl(trimmed, width);
  if (decodedImageUrls.has(targetUrl)) return true;
  const existing = decodedImageRefs.get(targetUrl);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    recordDimensionsFromElement(targetUrl, existing);
    return true;
  }

  if (width <= 420) {
    for (const altW of [360, 420, 280]) {
      if (altW === width) continue;
      const altUrl = getOptimizedImageUrl(trimmed, altW);
      if (decodedImageUrls.has(altUrl)) return true;
      const altImg = decodedImageRefs.get(altUrl);
      if (altImg && altImg.complete && altImg.naturalWidth > 0) {
        recordDimensionsFromElement(altUrl, altImg);
        return true;
      }
    }
  }
  return false;
}

/**
 * Preloads the PromptDetailModal client module once so clicking any prompt card
 * opens synchronously with 0ms delay.
 */
export function warmPromptDetailModalChunk(): void {
  if (typeof window === 'undefined' || modalChunkPromise) return;
  modalChunkPromise = import('@/components/public/PromptDetailModal').catch(() => {
    modalChunkPromise = null;
  });
}

function flushPendingPromptStorageWrites(): void {
  storageFlushTimer = null;
  if (typeof window === 'undefined' || pendingStorageWrites.size === 0) return;
  const batch = pendingStorageWrites;
  pendingStorageWrites = new Map();
  try {
    const raw = localStorage.getItem(PROMPT_DETAIL_CACHE_KEY);
    const map: Record<string, { post: PromptPost; savedAt: number }> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    batch.forEach((post, key) => {
      map[key] = { post, savedAt: now };
    });
    const entries = Object.entries(map);
    if (entries.length > 140) {
      entries.sort((a, b) => b[1].savedAt - a[1].savedAt);
      localStorage.setItem(PROMPT_DETAIL_CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, 120))));
    } else {
      localStorage.setItem(PROMPT_DETAIL_CACHE_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Persists a PromptPost locally in memory and localStorage (batched asynchronously)
 * so reopening or direct-navigating to the prompt never hits loading skeletons.
 */
export function cachePromptDetailLocally(post: PromptPost | null | undefined): void {
  if (typeof window === 'undefined' || !post || !post.id) return;
  const idKey = post.id.toLowerCase().trim();
  if (idKey) {
    cachedPromptPostsMemory.set(idKey, post);
    pendingStorageWrites.set(idKey, post);
  }
  if (post.slug && typeof post.slug === 'string') {
    const slugKey = post.slug.toLowerCase().trim();
    if (slugKey) {
      cachedPromptPostsMemory.set(slugKey, post);
      pendingStorageWrites.set(slugKey, post);
    }
  }
  if (!storageFlushTimer) {
    storageFlushTimer = setTimeout(flushPendingPromptStorageWrites, 180);
  }
}

/**
 * Decodes an image into memory and persists it into the browser Cache API
 * so opened viewport prompt cards display immediately at 0ms without loading skeletons.
 */
export function preloadAndCacheImageUrl(rawUrl: string | undefined | null, width = 800): void {
  if (typeof window === 'undefined' || !rawUrl || typeof rawUrl !== 'string') return;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) return;

  const targetUrl = getOptimizedImageUrl(trimmed, width);
  if (warmedImageUrls.has(targetUrl)) return;
  warmedImageUrls.add(targetUrl);

  // 1. Decode via Image() and retain handle so bitmap stays hot in device memory
  const img = new window.Image();
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'sync';
  img.onload = () => {
    recordDimensionsFromElement(targetUrl, img);
  };
  img.src = targetUrl;
  retainDecodedImageRef(targetUrl, img);

  if (typeof img.decode === 'function') {
    img
      .decode()
      .then(() => {
        recordDimensionsFromElement(targetUrl, img);
      })
      .catch(() => {});
  }

  // 2. Persist into browser Cache API for instant offline/reopen/direct-URL hits
  if ('caches' in window && (window.isSecureContext || window.location.hostname === 'localhost')) {
    caches
      .open(VIEWPORT_CACHE_NAME)
      .then((cache) =>
        cache.match(targetUrl).then((hit) =>
          hit
            ? null
            : fetch(targetUrl, { mode: 'cors', credentials: 'omit' }).then((res) =>
                res && res.ok ? cache.put(targetUrl, res) : null
              )
        )
      )
      .catch(() => {});
  }
}

/**
 * Prepares a single "More to explore" card as it scrolls into the modal viewport:
 * caches feed preview (360w), full detail image (800w), multi-image slides + thumbnails,
 * and stores post data locally for 0s delay opening with zero layout shift or skeleton.
 */
export function prepareMoreToExploreCard(post: PromptPost | null | undefined): void {
  if (typeof window === 'undefined' || !post) return;

  warmPromptDetailModalChunk();
  cachePromptDetailLocally(post);

  if (post.imageUrl) {
    preloadAndCacheImageUrl(post.imageUrl, 360);
    preloadAndCacheImageUrl(post.imageUrl, 800);
    if (Array.isArray(post.additionalImages) && post.additionalImages.length > 0) {
      preloadAndCacheImageUrl(post.imageUrl, 160);
    }
  }

  if (Array.isArray(post.additionalImages)) {
    for (const extraUrl of post.additionalImages.slice(0, 6)) {
      if (extraUrl) {
        preloadAndCacheImageUrl(extraUrl, 360);
        preloadAndCacheImageUrl(extraUrl, 800);
        preloadAndCacheImageUrl(extraUrl, 160);
      }
    }
  }
}

/**
 * Prepares the full set of visible viewport cards immediately upon homepage landing:
 * warms the detail modal and caches both feed (360w) and modal detail (800w) images.
 */
export function prepareViewportPromptCards(posts: PromptPost[], maxCards = 10): void {
  if (typeof window === 'undefined' || !Array.isArray(posts) || posts.length === 0) return;

  warmPromptDetailModalChunk();

  const slice = posts.slice(0, maxCards);
  for (const post of slice) {
    if (!post) continue;
    cachePromptDetailLocally(post);
    if (post.imageUrl) {
      preloadAndCacheImageUrl(post.imageUrl, 360);
      preloadAndCacheImageUrl(post.imageUrl, 800);
    }
    if (Array.isArray(post.additionalImages)) {
      for (const extraUrl of post.additionalImages.slice(0, 2)) {
        if (extraUrl) {
          preloadAndCacheImageUrl(extraUrl, 360);
          preloadAndCacheImageUrl(extraUrl, 800);
        }
      }
    }
  }
}
