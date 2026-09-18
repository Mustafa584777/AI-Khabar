'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sparkles, AlertTriangle } from 'lucide-react';

const LoadingOverlayInner = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSlowWarning, setShowSlowWarning] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450);

    let slowTimer: NodeJS.Timeout | null = null;
    let hideSlowTimer: NodeJS.Timeout | null = null;

    try {
      const countStr = localStorage.getItem('auraprompt_slow_warning_count') || '0';
      const count = parseInt(countStr, 10);
      const lastTimeStr = localStorage.getItem('auraprompt_last_slow_warning_time') || '0';
      const lastTime = parseInt(lastTimeStr, 10);
      const now = Date.now();

      if (count < 2 && (now - lastTime > 2000)) {
        slowTimer = setTimeout(() => {
          setShowSlowWarning(true);
          localStorage.setItem('auraprompt_slow_warning_count', (count + 1).toString());
          localStorage.setItem('auraprompt_last_slow_warning_time', Date.now().toString());

          hideSlowTimer = setTimeout(() => {
            setShowSlowWarning(false);
          }, 2000);
        }, 3000);
      }
    } catch (e) {}

    return () => {
      clearTimeout(timer);
      if (slowTimer) clearTimeout(slowTimer);
      if (hideSlowTimer) clearTimeout(hideSlowTimer);
    };
  }, [pathname, searchParams]);

  if (!isLoading && !showSlowWarning) return null;

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shadow-lg animate-pulse mb-4">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mb-2">
            Loading Page & Studio...
          </h3>
          <div className="w-48 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div className="w-full h-full bg-[#E60023] animate-[indeterminate_1.5s_infinite_linear]" />
          </div>
        </div>
      )}

      {showSlowWarning && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-black animate-in slide-in-from-bottom-5 duration-300 border border-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
          <div>
            <p className="font-black">Slow internet connection detected</p>
            <p className="text-[11px] font-medium text-amber-100">
              Please wait while the page finishes loading...
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
