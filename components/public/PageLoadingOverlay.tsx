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

  // Trigger loading on pathname change
  useEffect(() => {
    let title = 'Loading Page & Studio...';
    if (pathname === '/create') title = 'Opening AI Studio & Prompt Generator...';
    else if (pathname === '/dashboard') title = 'Loading Creator Dashboard & History...';
    else if (pathname === '/notifications') title = 'Loading Notifications & Drops...';
    else if (pathname === '/pricing') title = 'Loading Membership Plans...';

    setLoadingText(title);
    setIsLoading(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    let slowTimer: NodeJS.Timeout | null = null;
    let hideSlowTimer: NodeJS.Timeout | null = null;

    try {
      slowTimer = setTimeout(() => {
        setShowSlowWarning(true);
        hideSlowTimer = setTimeout(() => {
          setShowSlowWarning(false);
        }, 3000);
      }, 2500);
    } catch (e) {}

    return () => {
      clearTimeout(timer);
      if (slowTimer) clearTimeout(slowTimer);
      if (hideSlowTimer) clearTimeout(hideSlowTimer);
    };
  }, [pathname, searchParams]);

  // Global click listener for navigation links (Create, Dashboard, Notifications) to show immediate feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button');
      if (!target) return;
      const href = target.getAttribute('href') || target.getAttribute('id');
      const text = target.textContent?.toLowerCase() || '';

      if (
        href?.includes('/create') ||
        href?.includes('/dashboard') ||
        href?.includes('/notifications') ||
        text.includes('create') ||
        text.includes('dashboard') ||
        text.includes('notifications') ||
        text.includes('updates')
      ) {
        if (href?.includes('/create')) setLoadingText('Opening AI Studio...');
        else if (href?.includes('/dashboard')) setLoadingText('Loading Creator Dashboard...');
        else if (href?.includes('/notifications')) setLoadingText('Loading Notifications...');
        else setLoadingText('Loading Studio...');
        setIsLoading(true);
      }
    };

    window.addEventListener('click', handleClick, { capture: true });
    return () => window.removeEventListener('click', handleClick, { capture: true });
  }, []);

  if (!isLoading && !showSlowWarning) return null;

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shadow-lg animate-pulse mb-4">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mb-2 text-center px-4">
            {loadingText}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center">
            Please wait a moment while content loads...
          </p>
          <div className="w-48 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div className="w-full h-full bg-[#E60023] animate-[indeterminate_1.5s_infinite_linear]" />
          </div>
        </div>
      )}

      {showSlowWarning && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-black animate-in slide-in-from-bottom-5 duration-300 border border-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
          <div>
            <p className="font-black">Slow connection detected</p>
            <p className="text-[11px] font-medium text-amber-100">
              Your request is processing, please hold on...
            </p>
          </div>
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
