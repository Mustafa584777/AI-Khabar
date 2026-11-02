'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, AlertTriangle } from 'lucide-react';

const LoadingOverlayInner = () => {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSlowWarning, setShowSlowWarning] = useState<boolean>(false);
  const currentPathRef = useRef(pathname);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Instantly clear any loading state as soon as pathname changes (0ms delay, no blocking)
  useEffect(() => {
    if (pathname !== currentPathRef.current) {
      currentPathRef.current = pathname;
      setIsNavigating(false);
      setActionLoading(null);
      setShowSlowWarning(false);
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    }
  }, [pathname]);

  // Click listener for explicit heavy actions (Decode, Generate version) or route navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button');
      if (!target) return;

      const actionAttr = target.getAttribute('data-action') || '';
      const text = (target.textContent || '').trim().toLowerCase();
      const href = (target.getAttribute('href') || '').trim();

      // Only trigger action indicator for explicit studio decode/generator actions
      if (actionAttr === 'decode-prompt' || text === 'decode') {
        setActionLoading('Opening Image-to-Prompt Studio...');
      } else if (actionAttr === 'generate-version' || text === 'generate new version') {
        setActionLoading('Opening Prompt Generator...');
      } else if (href && href.startsWith('/') && href !== pathname && !href.startsWith('#')) {
        // Standard route change: show sleek non-blocking top progress bar
        setIsNavigating(true);
      } else {
        return;
      }

      // Strict Failsafe: Automatically dismiss after 350ms maximum, guaranteed!
      // This ensures NO loading skeleton or overlay can EVER get stuck on screen!
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
        setActionLoading(null);
      }, 350);

      // Slow connection warning only if navigation stalls for over 4 seconds
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        setShowSlowWarning(true);
        setTimeout(() => setShowSlowWarning(false), 3000);
      }, 4000);
    };

    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [pathname]);

  return (
    <>
      {/* Sleek, Non-Blocking Top Progress Bar (Like YouTube / GitHub) */}
      {(isNavigating || actionLoading) && (
        <div
          id="global-page-progress-bar"
          className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-neutral-200/40 dark:bg-neutral-800/40 pointer-events-none overflow-hidden"
        >
          <div className="h-full bg-gradient-to-r from-[#E60023] via-rose-500 to-amber-500 animate-[indeterminate_0.6s_infinite_linear] shadow-sm shadow-red-500/50" />
        </div>
      )}

      {/* Brief Action Loader for Heavy Decode/Generate Studio Actions - Never blocks clicks (pointer-events-none) */}
      {actionLoading && (
        <div
          className="fixed inset-0 z-50 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 transition-all duration-150 pointer-events-none"
          id="global-action-loading-overlay"
        >
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shadow-lg animate-pulse mb-3">
            <Sparkles className="w-7 h-7 animate-spin" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white mb-1 text-center px-4">
            {actionLoading}
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center">
            Loading studio tools...
          </p>
        </div>
      )}

      {/* Slow internet alert */}
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
