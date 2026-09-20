'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sparkles, AlertTriangle } from 'lucide-react';

const LoadingOverlayInner = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Loading Page & Studio...');
  const [showSlowWarning, setShowSlowWarning] = useState<boolean>(false);

  // Trigger loading on pathname change or navigation (only on first visit per route in session)
  useEffect(() => {
    const visitKey = `visited_route_${pathname}`;
    try {
      if (sessionStorage.getItem(visitKey)) {
        return;
      }
    } catch (e) {}

    let title = 'Loading Page & Studio...';
    if (pathname === '/create') title = 'Opening AI Studio & Prompt Generator...';
    else if (pathname === '/dashboard') title = 'Loading Creator Dashboard & History...';
    else if (pathname === '/notifications') title = 'Loading Notifications & Drops...';
    else if (pathname === '/pricing') title = 'Loading Membership Plans...';
    else if (pathname === '/') title = 'Loading Home Feed & Prompts...';

    const t = setTimeout(() => {
      setLoadingText(title);
      setIsLoading(true);
    }, 0);

    const timer = setTimeout(() => {
      setIsLoading(false);
      try {
        sessionStorage.setItem(visitKey, 'true');
      } catch (e) {}
    }, 1000);

    let slowTimer: NodeJS.Timeout | null = null;
    let hideSlowTimer: NodeJS.Timeout | null = null;
    try {
      slowTimer = setTimeout(() => {
        setShowSlowWarning(true);
        hideSlowTimer = setTimeout(() => {
          setShowSlowWarning(false);
        }, 3000);
      }, 1500);
    } catch (e) {}

    return () => {
      clearTimeout(t);
      clearTimeout(timer);
      if (slowTimer) clearTimeout(slowTimer);
      if (hideSlowTimer) clearTimeout(hideSlowTimer);
    };
  }, [pathname, searchParams]);

  // Global click listener for navigation buttons and links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button');
      if (!target) return;
      const href = target.getAttribute('href') || target.getAttribute('id') || '';
      const text = target.textContent?.toLowerCase() || '';

      // Determine target route key
      let targetPath = '';
      if (href.includes('/create') || text.includes('create') || text.includes('ai studio')) targetPath = '/create';
      else if (href.includes('/dashboard') || text.includes('dashboard') || text.includes('sign in') || text.includes('saved')) targetPath = '/dashboard';
      else if (href.includes('/notifications') || text.includes('notifications') || text.includes('updates')) targetPath = '/notifications';
      else if (href.includes('/pricing') || text.includes('pricing')) targetPath = '/pricing';
      else if (href.includes('/') || text.includes('home') || text.includes('explore') || text.includes('search')) targetPath = '/';

      if (targetPath) {
        const visitKey = `visited_route_${targetPath}`;
        const isAlreadyVisited = sessionStorage.getItem(visitKey);

        if (isAlreadyVisited) {
          // Already visited, do not show loading overlay
          return;
        }

        if (targetPath === '/create') {
          setLoadingText('Opening AI Studio & Prompt Generator...');
        } else if (targetPath === '/dashboard') {
          setLoadingText('Loading Creator Dashboard & Account...');
        } else if (targetPath === '/notifications') {
          setLoadingText('Loading Notifications & Drops...');
        } else if (targetPath === '/pricing') {
          setLoadingText('Loading Membership Plans...');
        } else {
          setLoadingText('Loading Home Feed & Content...');
        }

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
          }, 1500);
        } catch (e) {}

        setTimeout(() => {
          setIsLoading(false);
          try {
            sessionStorage.setItem(visitKey, 'true');
          } catch (err) {}
          if (slowCheck) clearTimeout(slowCheck);
          if (hideSlowCheck) clearTimeout(hideSlowCheck);
        }, 1000);
      }
    };

    window.addEventListener('click', handleClick, { capture: true });
    return () => window.removeEventListener('click', handleClick, { capture: true });
  }, []);

  if (!isLoading && !showSlowWarning) return null;

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all duration-300">
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

          {/* Skeleton placeholder bars */}
          <div className="w-full max-w-xs mt-8 space-y-3 opacity-60">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse w-3/4 mx-auto" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse w-1/2 mx-auto" />
          </div>
        </div>
      )}

      {showSlowWarning && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-black animate-in slide-in-from-bottom-5 duration-300 border border-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
          <div>
            <p className="font-black">Slow internet connection detected</p>
            <p className="text-[11px] font-medium text-amber-100">
              Your request is processing securely, please hold on...
            </p>
          </div>
          <button
            onClick={() => setShowSlowWarning(false)}
            className="ml-2 text-white/80 hover:text-white text-xs px-2 py-1 bg-black/20 rounded-lg"
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
