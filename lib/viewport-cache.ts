'use client';

import { getOptimizedImageUrl } from '@/lib/utils';
import { PromptPost } from '@/types/prompt';

const warmedImageUrls = new Set<string>();
const decodedImageUrls = new Set<string>();
// Retain active references to decoded Image objects so Chromium/WebKit keeps bitmaps hot in memory
const decodedImageRefs = new Map<string, HTMLImageElement>();
const VIEWPORT_CACHE_NAME = 'zeenaprompt-viewport-images-v1';
let modalChunkPromise: Promise<unknown> | null = null;

/**
 * Returns true if the given image URL (at target width) has already finished
 * loading/decoding into the user's browser memory cache.
 */
export function isImageUrlCachedInMemory(rawUrl: string | undefined | null, width = 800): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const targetUrl = getOptimizedImageUrl(rawUrl.trim(), width);
  if (decodedImageUrls.has(targetUrl)) return true;
  const existing = decodedImageRefs.get(targetUrl);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    decodedImageUrls.add(targetUrl);
    return true;
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
    decodedImageUrls.add(targetUrl);
  };
  img.src = targetUrl;
  if (decodedImageRefs.size < 60) {
    decodedImageRefs.set(targetUrl, img);
  }
  if (typeof img.decode === 'function') {
    img
      .decode()
      .then(() => {
        decodedImageUrls.add(targetUrl);
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
 * Prepares the full set of visible viewport cards immediately upon homepage landing:
 * warms the detail modal and caches both feed (360w) and modal detail (800w) images.
 */
export function prepareViewportPromptCards(posts: PromptPost[], maxCards = 10): void {
  if (typeof window === 'undefined' || !Array.isArray(posts) || posts.length === 0) return;

  warmPromptDetailModalChunk();

  const slice = posts.slice(0, maxCards);
  for (const post of slice) {
    if (!post) continue;
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
