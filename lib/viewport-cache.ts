'use client';

import { getOptimizedImageUrl } from '@/lib/utils';
import { PromptPost } from '@/types/prompt';

const warmedImageUrls = new Set<string>();
const VIEWPORT_CACHE_NAME = 'zeenaprompt-viewport-images-v1';
let modalChunkPromise: Promise<unknown> | null = null;

/**
 * Preloads the PromptDetailModal client chunk once so clicking any viewport
 * prompt card opens synchronously in 0ms without dynamic-import delay.
 */
export function warmPromptDetailModalChunk(): void {
  if (typeof window === 'undefined' || modalChunkPromise) return;
  modalChunkPromise = import('@/components/public/PromptDetailModal').catch(() => {
    modalChunkPromise = null;
  });
}

/**
 * Decodes an image in memory and warms the browser Cache API (with graceful fallback)
 * so opened cards display full-resolution photography immediately at 0ms.
 */
export function preloadAndCacheImageUrl(rawUrl: string | undefined | null, width = 800): void {
  if (typeof window === 'undefined' || !rawUrl || typeof rawUrl !== 'string') return;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) return;

  const targetUrl = getOptimizedImageUrl(trimmed, width);
  if (warmedImageUrls.has(targetUrl)) return;
  warmedImageUrls.add(targetUrl);

  // 1. Decode via Image() so image sits decoded in Chromium/WebKit memory cache
  const img = new window.Image();
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.src = targetUrl;
  if (typeof img.decode === 'function') {
    img.decode().catch(() => {});
  }

  // 2. Persist into browser Cache API for repeat & direct-open instant hits
  if ('caches' in window && (window.isSecureContext || window.location.hostname === 'localhost')) {
    caches
      .open(VIEWPORT_CACHE_NAME)
      .then((cache) => cache.match(targetUrl).then((hit) => (hit ? null : fetch(targetUrl, { mode: 'cors', credentials: 'omit' }).then((res) => (res && res.ok ? cache.put(targetUrl, res) : null)))))
      .catch(() => {});
  }
}

/**
 * Prepares the full set of visible viewport cards on landing:
 * warms both the detail modal chunk and each card's 360w + 800w images.
 */
export function prepareViewportPromptCards(posts: PromptPost[], maxCards = 8): void {
  if (typeof window === 'undefined' || !Array.isArray(posts) || posts.length === 0) return;

  warmPromptDetailModalChunk();

  const slice = posts.slice(0, maxCards);
  for (const post of slice) {
    if (!post?.imageUrl) continue;
    preloadAndCacheImageUrl(post.imageUrl, 360);
    preloadAndCacheImageUrl(post.imageUrl, 800);
  }
}
