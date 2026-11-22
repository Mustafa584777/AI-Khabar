'use client';

export const NAV_START_EVENT = 'zeena:navigation-start';

export interface NavigationStartDetail {
  targetUrl: string;
  label?: string;
}

const CACHED_ROUTES_STORAGE_KEY = 'zeena_cached_routes_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const inMemoryCachedRoutes = new Set<string>();
let hasHydratedCachedRoutes = false;

function normalizeRouteCacheKey(url: string): string {
  const clean = normalizeInternalUrl(url);
  if (!clean) return '';
  return clean === '/' ? '/' : clean.replace(/\/+$/, '');
}

function hydrateCachedRoutes(): void {
  if (hasHydratedCachedRoutes || typeof window === 'undefined') return;
  hasHydratedCachedRoutes = true;
  try {
    const raw = localStorage.getItem(CACHED_ROUTES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== 'object') return;
    const now = Date.now();
    let changed = false;
    for (const [key, savedAt] of Object.entries(parsed)) {
      if (typeof savedAt === 'number' && now - savedAt < CACHE_TTL_MS) {
        inMemoryCachedRoutes.add(key);
      } else {
        delete parsed[key];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(CACHED_ROUTES_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

/**
 * Normalizes an internal app URL to `pathname + search` (stripping origin and hash).
 * Returns an empty string for external, hash-only, or non-http(s) URLs.
 */
export function normalizeInternalUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return '';
  }

  try {
    if (typeof window === 'undefined') {
      return trimmed.split('#')[0] || '';
    }
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return '';
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return '';
  }
}

/**
 * Marks a route as completely loaded & cached after the user has visited and
 * settled on it, so subsequent visits open at 0s delay without a loading skeleton.
 */
export function markRouteCached(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  hydrateCachedRoutes();

  const fullKey = normalizeRouteCacheKey(url);
  if (!fullKey) return;
  const pathOnlyKey = fullKey.split('?')[0] || '/';

  inMemoryCachedRoutes.add(fullKey);
  inMemoryCachedRoutes.add(pathOnlyKey);

  try {
    const raw = localStorage.getItem(CACHED_ROUTES_STORAGE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    map[fullKey] = now;
    map[pathOnlyKey] = now;
    localStorage.setItem(CACHED_ROUTES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Returns true if the target route has already been fully loaded & cached,
 * allowing zero-delay revisits with no loading skeleton overlay.
 */
export function isRouteCached(url: string): boolean {
  if (typeof window === 'undefined' || !url) return false;
  hydrateCachedRoutes();

  const fullKey = normalizeRouteCacheKey(url);
  if (!fullKey) return false;
  const pathOnlyKey = fullKey.split('?')[0] || '/';

  return inMemoryCachedRoutes.has(fullKey) || inMemoryCachedRoutes.has(pathOnlyKey);
}

/**
 * Returns all currently cached route paths for router warmup.
 */
export function getCachedRoutesList(): string[] {
  if (typeof window === 'undefined') return [];
  hydrateCachedRoutes();
  return Array.from(inMemoryCachedRoutes);
}

/**
 * Triggers the global smart route loading skeleton on uncached navigations
 * until the target route finishes mounting and painting.
 * Cached routes bypass the skeleton completely for instant 0s transitions.
 */
export function startRouteNavigation(targetUrl: string, label?: string) {
  if (typeof window === 'undefined' || !targetUrl) return;
  const normalizedTarget = normalizeInternalUrl(targetUrl);
  if (!normalizedTarget) return;

  const currentFull = `${window.location.pathname}${window.location.search}`;
  if (normalizedTarget === currentFull) return;

  if (isRouteCached(normalizedTarget)) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NavigationStartDetail>(NAV_START_EVENT, {
      detail: { targetUrl: normalizedTarget, label },
    })
  );
}

/**
 * Updates browser URL to a prompt slug while preserving Next.js App Router
 * internal history state so browser/mobile Back steps backward through each
 * explored prompt instantaneously in memory before returning to the homepage.
 */
export function pushPromptHistoryState(postId: string, slug: string) {
  if (typeof window === 'undefined' || !postId || !slug) return;
  try {
    const currentState =
      window.history.state && typeof window.history.state === 'object'
        ? window.history.state
        : {};
    window.history.pushState(
      {
        ...currentState,
        postId,
        selectedPostId: postId,
        isPromptDetail: true,
      },
      '',
      `/${slug}`
    );
  } catch {}
}
