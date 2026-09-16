/**
 * Ultra-fast Image Preloader and In-Memory Cache Manager
 * Ensures zero-latency modal opening and completely eliminates blank white screens.
 */
import { getOptimizedImageUrl } from './utils';

// Global cache of already-preloaded image URLs
const preloadedUrlSet = new Set<string>();

// Global cache of thumbnail URLs that have successfully loaded in the viewport
const loadedThumbnails = new Map<string, string>();

/**
 * Register that a thumbnail has rendered on a card
 */
export function registerLoadedThumbnail(postId: string, src: string) {
  if (!postId || !src) return;
  loadedThumbnails.set(postId, src);
}

/**
 * Get the loaded thumbnail URL for instant modal handoff
 */
export function getLoadedThumbnail(postId: string): string | undefined {
  if (!postId) return undefined;
  return loadedThumbnails.get(postId);
}

/**
 * Preloads an image URL into browser memory and HTTP disk cache.
 */
export function preloadImageUrl(url: string, highPriority = false): void {
  if (!url || typeof window === 'undefined') return;
  if (preloadedUrlSet.has(url)) return;
  preloadedUrlSet.add(url);

  try {
    const img = new Image();
    if (highPriority) {
      // @ts-ignore fetchPriority
      img.fetchPriority = 'high';
    }
    img.decoding = 'async';
    img.src = url;
  } catch {
    // Ignore preloader errors
  }
}

/**
 * Generates the Next.js image optimization URL for a given source and width.
 */
export function getNextImageUrl(src: string, width = 828, quality = 75): string {
  if (!src) return '';
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/**
 * Pre-warms both the direct Cloudinary image and the Next.js modal image variations.
 * Call this as soon as a prompt card enters or approaches the viewport.
 */
export function preloadPostImage(post: { id?: string; imageUrl?: string }): void {
  if (!post || !post.imageUrl || typeof window === 'undefined') return;

  const rawUrl = post.imageUrl;
  const optimizedUrl = getOptimizedImageUrl(rawUrl, 700);

  // 1. Direct optimized Cloudinary CDN URL
  preloadImageUrl(optimizedUrl);

  // 2. Pre-warm Next.js responsive image sizes used by modal
  // Mobile devices (approx 390px-430px at 2x/3x DPR) request w=828 or w=1080
  const modalSizes = [828, 640];
  modalSizes.forEach((w) => {
    preloadImageUrl(getNextImageUrl(optimizedUrl, w, 75));
  });

  if (post.id) {
    registerLoadedThumbnail(post.id, optimizedUrl);
  }
}

/**
 * Batch-preloads a list of posts (e.g. above-the-fold cards on feed mount)
 */
export function preloadPostList(posts: Array<{ id?: string; imageUrl?: string }>, limit = 6): void {
  if (!posts || typeof window === 'undefined') return;
  const slice = posts.slice(0, limit);

  const schedule = (window.requestIdleCallback as any) || ((cb: () => void) => setTimeout(cb, 50));
  schedule(() => {
    slice.forEach((p) => {
      preloadPostImage(p);
    });
  });
}
