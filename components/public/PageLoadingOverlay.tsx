'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, AlertTriangle } from 'lucide-react';

const LoadingOverlayInner = () => {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Loading Page & Studio...');
  const [showSlowWarning, setShowSlowWarning] = useState<boolean>(false);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  // Clear session visited flags on page reload (F5 / browser refresh)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0 && navEntries[0].type === 'reload') {
          sessionStorage.removeItem('visited_route_/create');
          sessionStorage.removeItem('visited_route_/dashboard');
          sessionStorage.removeItem('visited_route_/notifications');
          sessionStorage.removeItem('visited_route_/pricing');
          sessionStorage.removeItem('visited_route_/prompt-editor');
          sessionStorage.removeItem('visited_route_/');
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Monitor route changes to dismiss loading overlay once user has successfully landed on target page
  useEffect(() => {
    if (!pendingTarget) return;

    if (pathname === pendingTarget) {
      // User has landed on target page! Ensure minimum aesthetic loading time (800ms) then dismiss
      const timer = setTimeout(() => {
        setIsLoading(false);
        try {
          sessionStorage.setItem(`visited_route_${pendingTarget}`, 'true');
        } catch {
          // ignore
        }
        setPendingTarget(null);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [pathname, pendingTarget]);

  // Click listener for navigation and action buttons (Decode, Edit, Generate new version)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button');
      if (!target) return;

      const actionAttr = target.getAttribute('data-action') || '';
      const titleAttr = (target.getAttribute('title') || '').toLowerCase();
      const text = (target.textContent || '').trim().toLowerCase();
      const href = (target.getAttribute('href') || '').trim();
      const id = (target.getAttribute('id') || '').trim();

      let targetPath = '';
      let customLoadingText = 'Loading Studio & Prompts...';

      // Check for action buttons (Decode, Edit, Generate new version)
      if (
        actionAttr === 'decode-prompt' ||
        titleAttr.includes('edit') ||
        titleAttr.includes('generate new version') ||
        text === 'decode' ||
        text === 'edit' ||
        text === 'generate new version'
      ) {
        targetPath = '/create';
        if (actionAttr === 'decode-prompt' || text === 'decode') {
          customLoadingText = 'Opening Image-to-Prompt & Studio...';
        } else if (titleAttr.includes('edit') || text === 'edit') {
          customLoadingText = 'Loading Prompt Editor...';
        } else {
          customLoadingText = 'Opening Prompt Generator...';
        }
      } else {
        // STRICT EXCLUSION for other prompt cards/pins unless action matched
        if (
          target.closest('[id^="prompt-pin-"]') ||
          target.closest('[id^="masonry-pin-"]') ||
          (target.closest('article') && !actionAttr)
        ) {
          return;
        }

        if (href === '/create' || id === 'header-create-tool-btn' || id === 'bottom-nav-create-tool') {
          targetPath = '/create';
        } else if (href === '/dashboard' || id === 'header-account-btn' || id === 'bottom-nav-account') {
          targetPath = '/dashboard';
        } else if (href === '/notifications' || id === 'header-notifications-btn' || id === 'bottom-nav-notifications') {
          targetPath = '/notifications';
        } else if (href === '/pricing') {
          targetPath = '/pricing';
        } else if (href === '/' || id === 'brand-logo-btn' || id === 'bottom-nav-home' || text === 'home') {
          targetPath = '/';
        }
      }

      if (!targetPath) return;

      // If already on this path, do not trigger loading overlay
      if (pathname === targetPath && !actionAttr) return;

      const visitKey = `visited_route_${targetPath}`;
      try {
        if (sessionStorage.getItem(visitKey)) {
          return; // Already loaded this session, do not trigger again
        }
      } catch {
        // ignore
      }

      setLoadingText(customLoadingText);
      setPendingTarget(targetPath);
      setIsLoading(true);
      setShowSlowWarning(false);

      let slowCheck: NodeJS.Timeout | null = null;
      let hideSlowCheck: NodeJS.Timeout | null = null;
      try {
        slowCheck = setTimeout(() => {
          setShowSlowWarning(true);
          hideSlowCheck = setTimeout(() => {
            setShowSlowWarning(false);
          }, 3000);
        }, 2000);
      } catch {
        // ignore
      }

      // Cleanup slow warning on unmount or landing
      const cleanupSlow = () => {
        if (slowCheck) clearTimeout(slowCheck);
        if (hideSlowCheck) clearTimeout(hideSlowCheck);
      };
      // Store cleanup ref if needed or handled by effect
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [pathname]);

  if (!isLoading && !showSlowWarning) return null;

  return (
    <>
      {isLoading && (
        <div
          className="fixed inset-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all duration-200"
          id="global-page-loading-overlay"
        >
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shadow-lg animate-pulse mb-4">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mb-2 text-center px-4">
            {loadingText}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 text-center">
            Optimizing for your connection, please wait...
          </p>
          <div className="w-56 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden shadow-inner">
            <div className="w-full h-full bg-[#E60023] animate-[indeterminate_1.2s_infinite_linear]" />
          </div>
        </div>
      )}

      {showSlowWarning && (
        <div
          id="slow-internet-alert"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-black animate-in slide-in-from-bottom-5 duration-300 border border-amber-400"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
          <div>
            <p className="font-black">Slow internet connection detected</p>
            <p className="text-[11px] font-medium text-amber-100">
              Your request is processing securely, please hold on...
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSlowWarning(false)}
            className="ml-2 text-white/80 hover:text-white text-xs px-2 py-1 bg-black/20 rounded-lg cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
};

export const PageLoadingOverlay = () => {
  return (
    <Suspense fallback={null}>
      <LoadingOverlayInner />
    </Suspense>
  );
};
