'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export type AdsterraVariant =
  | '300x250'
  | '468x60'
  | '320x50'
  | '160x300'
  | '728x90'
  | '160x600';

interface AdUnitSpec {
  key: string;
  width: number;
  height: number;
}

export const ADSTERRA_UNITS: Record<AdsterraVariant, AdUnitSpec> = {
  '300x250': {
    key: '6fcff6fea5579be53f38513738dbfdd5',
    width: 300,
    height: 250,
  },
  '468x60': {
    key: '2a28d27f501ec7b43a9afd48ad3ec865',
    width: 468,
    height: 60,
  },
  '320x50': {
    key: '9b58debc429583917dd34bd61986d4b5',
    width: 320,
    height: 50,
  },
  '160x300': {
    key: 'bd090ec18f607dbf12c6529ede52e49b',
    width: 160,
    height: 300,
  },
  '728x90': {
    key: '76d8b1a02790bb7aff4b77a7aed66dc7',
    width: 728,
    height: 90,
  },
  '160x600': {
    key: '6601fdc20aaa753f8ac9814e8c0f4913',
    width: 160,
    height: 600,
  },
};

function buildAdSrcDoc(spec: AdUnitSpec): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${spec.width}px;
        height: ${spec.height}px;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : '${spec.key}',
        'format' : 'iframe',
        'height' : ${spec.height},
        'width' : ${spec.width},
        'params' : {}
      };
    </script>
    <script data-cfasync="false" src="https://bauval.org/22/${spec.key}"></script>
  </body>
</html>`;
}

function useShouldHideAds(allowInsideModal: boolean): boolean {
  const pathname = usePathname();
  const { currentView, isActivePremiumUser } = useApp();

  if (isActivePremiumUser) return true;
  if (currentView === 'admin') return true;
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/cms-login')) return true;
  if (!allowInsideModal && (pathname === '/' || pathname === '')) return true;

  return false;
}

interface AdsterraAdProps {
  variant: AdsterraVariant;
  className?: string;
  allowInsideModal?: boolean;
  /** Optional media query required to mount the iframe (e.g. "(min-width: 1280px)") so hidden slots never load scripts */
  minWidthMediaQuery?: string;
  compact?: boolean;
}

export function AdsterraAd({
  variant,
  className = '',
  allowInsideModal = false,
  minWidthMediaQuery,
  compact = false,
}: AdsterraAdProps) {
  const shouldHide = useShouldHideAds(allowInsideModal);
  const [isMounted, setIsMounted] = useState(false);
  const [matchesMedia, setMatchesMedia] = useState(!minWidthMediaQuery);
  const spec = ADSTERRA_UNITS[variant];
  const srcDoc = useMemo(() => buildAdSrcDoc(spec), [spec]);

  useEffect(() => {
    setIsMounted(true);
    if (!minWidthMediaQuery || typeof window === 'undefined') {
      setMatchesMedia(true);
      return;
    }
    const mq = window.matchMedia(minWidthMediaQuery);
    const sync = () => setMatchesMedia(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [minWidthMediaQuery]);

  if (shouldHide || (minWidthMediaQuery && isMounted && !matchesMedia)) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`flex flex-col items-center justify-center ${className}`}
    >
      <div
        className={`rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col items-center shadow-xs ${
          compact ? 'p-1.5 gap-1' : 'p-2 sm:p-2.5 gap-1.5'
        }`}
      >
        <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 select-none leading-none">
          Advertisement
        </span>
        <div
          style={{ width: spec.width, height: spec.height }}
          className="max-w-full overflow-hidden rounded-xl bg-neutral-200/40 dark:bg-neutral-950/60 flex items-center justify-center"
        >
          {isMounted && matchesMedia ? (
            <iframe
              title={`Sponsored Advertisement ${variant}`}
              srcDoc={srcDoc}
              width={spec.width}
              height={spec.height}
              scrolling="no"
              frameBorder={0}
              style={{ width: spec.width, height: spec.height }}
              className="border-0 overflow-hidden block"
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

interface AdsterraResponsiveLeaderboardProps {
  className?: string;
  allowInsideModal?: boolean;
}

/**
 * Renders strictly ONE ad unit matching the current viewport so mobile only loads 320x50,
 * small tablets load 468x60, and desktop/large tablets load 728x90 (zero wasted requests, 0 CLS).
 */
export function AdsterraResponsiveLeaderboard({
  className = '',
  allowInsideModal = false,
}: AdsterraResponsiveLeaderboardProps) {
  const shouldHide = useShouldHideAds(allowInsideModal);
  const [activeVariant, setActiveVariant] = useState<AdsterraVariant | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqDesktop = window.matchMedia('(min-width: 768px)');
    const mqTablet = window.matchMedia('(min-width: 520px)');

    const pick = () => {
      if (mqDesktop.matches) setActiveVariant('728x90');
      else if (mqTablet.matches) setActiveVariant('468x60');
      else setActiveVariant('320x50');
    };

    pick();
    mqDesktop.addEventListener('change', pick);
    mqTablet.addEventListener('change', pick);
    return () => {
      mqDesktop.removeEventListener('change', pick);
      mqTablet.removeEventListener('change', pick);
    };
  }, []);

  const spec = activeVariant ? ADSTERRA_UNITS[activeVariant] : null;
  const srcDoc = useMemo(() => (spec ? buildAdSrcDoc(spec) : ''), [spec]);

  if (shouldHide) return null;

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`w-full flex flex-col items-center justify-center ${className}`}
    >
      <div className="rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80 p-1.5 sm:p-2 flex flex-col items-center gap-1 shadow-xs max-w-full overflow-hidden">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 select-none leading-none">
          Advertisement
        </span>
        {/* Pre-reserved exact responsive height so 0 CLS before hydration */}
        <div className="w-[320px] h-[50px] min-[520px]:w-[468px] min-[520px]:h-[60px] md:w-[728px] md:h-[90px] max-w-full overflow-hidden rounded-xl bg-neutral-200/40 dark:bg-neutral-950/60 flex items-center justify-center">
          {spec && srcDoc ? (
            <iframe
              key={activeVariant}
              title={`Sponsored Advertisement ${activeVariant}`}
              srcDoc={srcDoc}
              width={spec.width}
              height={spec.height}
              scrolling="no"
              frameBorder={0}
              style={{ width: spec.width, height: spec.height }}
              className="border-0 overflow-hidden block"
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}
