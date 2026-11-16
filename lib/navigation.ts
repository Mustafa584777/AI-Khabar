'use client';

export const NAV_START_EVENT = 'zeena:navigation-start';

export interface NavigationStartDetail {
  targetUrl: string;
  label?: string;
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
 * Triggers the global smart route loading skeleton immediately on navigation
 * until the target route finishes mounting and painting.
 */
export function startRouteNavigation(targetUrl: string, label?: string) {
  if (typeof window === 'undefined' || !targetUrl) return;
  const normalizedTarget = normalizeInternalUrl(targetUrl);
  if (!normalizedTarget) return;

  const currentFull = `${window.location.pathname}${window.location.search}`;
  if (normalizedTarget === currentFull) return;

  window.dispatchEvent(
    new CustomEvent<NavigationStartDetail>(NAV_START_EVENT, {
      detail: { targetUrl: normalizedTarget, label },
    })
  );
}
