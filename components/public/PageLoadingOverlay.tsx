'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  NAV_START_EVENT,
  NavigationStartDetail,
  normalizeInternalUrl,
  markRouteCached,
  isRouteCached,
  getCachedRoutesList,
} from '@/lib/navigation';
import { SmartRouteSkeleton } from './SmartRouteSkeleton';

interface ActiveNavigationState {
  targetUrl: string;
  startUrl: string;
  label?: string;
}

const LoadingOverlayInner = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams ? searchParams.toString() : '';
  const currentFullUrl = `${pathname}${searchString ? `?${searchString}` : ''}`;

  const [navState, setNavState] = useState<ActiveNavigationState | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  const currentFullUrlRef = useRef(currentFullUrl);
  currentFullUrlRef.current = currentFullUrl;

  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const dismissImmediately = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(false);
    setIsSlow(false);
    setNavState(null);
  }, [clearAllTimers]);

  const dismissAfterPaint = useCallback(() => {
    clearAllTimers();
    const finish = () => {
      setIsFadingOut(true);
      fadeTimerRef.current = setTimeout(() => {
        setNavState(null);
        setIsFadingOut(false);
        setIsSlow(false);
      }, 120);
    };

    if (typeof requestAnimationFrame === 'function') {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(finish);
      });
    } else {
      finish();
    }
  }, [clearAllTimers]);

  const beginNavigation = useCallback(
    (targetUrl: string, label?: string) => {
      const normalized = normalizeInternalUrl(targetUrl);
      if (!normalized) return;

      const currentUrl =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : currentFullUrlRef.current;

      if (normalized === currentUrl) return;

      // If this page was already visited, loaded, and cached, open at 0s delay without showing skeleton
      if (isRouteCached(normalized)) {
        dismissImmediately();
        return;
      }

      clearAllTimers();
      setIsFadingOut(false);
      setIsSlow(false);
      setNavState({
        targetUrl: normalized,
        startUrl: currentUrl,
        label,
      });

      // Mark as slow if target page still hasn't appeared after 4.5s (with manual Dismiss button)
      slowTimerRef.current = setTimeout(() => {
        setIsSlow(true);
      }, 4500);

      // Hard safety cap (18s) so overlay can never get permanently orphaned on failed requests
      failsafeTimerRef.current = setTimeout(() => {
        dismissImmediately();
      }, 18000);
    },
    [clearAllTimers, dismissImmediately]
  );

  // Mark the active page as settled & cached once the user spends time on the fully loaded page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let settleTimer: number | null = null;
    let disposed = false;

    const markSettled = () => {
      if (disposed) return;
      settleTimer = window.setTimeout(() => {
        if (disposed) return;
        markRouteCached(currentFullUrl);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'PRECACHE_ROUTE',
              url: window.location.pathname,
            });
          } catch {}
        }
      }, 850);
    };

    if (document.readyState === 'complete') {
      markSettled();
    } else {
      window.addEventListener('load', markSettled, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener('load', markSettled);
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
    };
  }, [currentFullUrl]);

  // Keep already-cached routes hot in Next.js client router cache for synchronous 0ms revisit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const warmTimer = window.setTimeout(() => {
      const cached = getCachedRoutesList()
        .filter((route) => route && !route.includes('?') && route !== pathname)
        .slice(0, 8);
      for (const route of cached) {
        try {
          router.prefetch(route);
        } catch {}
      }
    }, 600);

    return () => window.clearTimeout(warmTimer);
  }, [pathname, router]);

  // Dismiss only once the target route commits & paints in the DOM
  useEffect(() => {
    if (!navState) return;
    if (currentFullUrl !== navState.startUrl) {
      dismissAfterPaint();
    }
  }, [currentFullUrl, navState, dismissAfterPaint]);

  // Capture-phase click listener catches every <Link>/<a> and navigation <button> before stopPropagation()
  useEffect(() => {
    const handleClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const el = e.target as HTMLElement | null;
      const target = el?.closest('a, button') as HTMLElement | null;
      if (!target) return;

      // Ignore disabled controls
      if ((target as HTMLButtonElement).disabled || target.getAttribute('aria-disabled') === 'true') {
        return;
      }

      if (target.tagName === 'A') {
        const anchor = target as HTMLAnchorElement;
        if (
          anchor.target === '_blank' ||
          anchor.hasAttribute('download')
        ) {
          return;
        }
        // Prompt cards open an instant in-memory modal rather than triggering a full route fetch
        if (anchor.closest('article[id^="prompt-pin-"]')) {
          return;
        }
        const href = anchor.getAttribute('href') || '';
        if (!href) return;
        beginNavigation(href);
        return;
      }

      // Handle explicit navigation buttons (capture phase fires even if onClick stops propagation)
      const navHref = target.getAttribute('data-nav-href');
      if (navHref) {
        const navLabel = target.getAttribute('data-nav-label') || undefined;
        beginNavigation(navHref, navLabel);
        return;
      }

      const actionAttr = target.getAttribute('data-action') || '';
      if (actionAttr === 'decode-prompt') {
        beginNavigation('/create', 'Opening Image-to-Prompt Studio...');
      } else if (actionAttr === 'generate-version') {
        beginNavigation('/create', 'Opening Prompt Generator...');
      }
    };

    const handleCustomNavStart = (e: Event) => {
      const detail = (e as CustomEvent<NavigationStartDetail>).detail;
      if (detail?.targetUrl) {
        beginNavigation(detail.targetUrl, detail.label);
      }
    };

    const handlePopState = () => {
      // Browser history back/forward aborted or changed route
      dismissAfterPaint();
    };

    window.addEventListener('click', handleClickCapture, true);
    window.addEventListener(NAV_START_EVENT, handleCustomNavStart);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('click', handleClickCapture, true);
      window.removeEventListener(NAV_START_EVENT, handleCustomNavStart);
      window.removeEventListener('popstate', handlePopState);
      clearAllTimers();
    };
  }, [beginNavigation, dismissAfterPaint, clearAllTimers]);

  if (!navState) return null;

  return (
    <div
      className={`transition-opacity duration-150 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <SmartRouteSkeleton
        targetUrl={navState.targetUrl}
        label={navState.label}
        isSlow={isSlow}
        onDismiss={dismissImmediately}
        isFullScreenOverlay={true}
      />
    </div>
  );
};

export const PageLoadingOverlay = () => {
  return (
    <Suspense fallback={null}>
      <LoadingOverlayInner />
    </Suspense>
  );
};
