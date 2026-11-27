'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const ADSTERRA_BANNER_SRCDOC = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 300px;
        height: 250px;
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
        'key' : '6fcff6fea5579be53f38513738dbfdd5',
        'format' : 'iframe',
        'height' : 250,
        'width' : 300,
        'params' : {}
      };
    </script>
    <script data-cfasync="false" src="https://bauval.org/22/6fcff6fea5579be53f38513738dbfdd5"></script>
  </body>
</html>`;

interface AdsterraBanner300x250Props {
  className?: string;
  allowInsideModal?: boolean;
}

export function AdsterraBanner300x250({
  className = '',
  allowInsideModal = false,
}: AdsterraBanner300x250Props) {
  const pathname = usePathname();
  const { currentView } = useApp();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Strictly exclude Admin Panel and Homepage feed
  if (currentView === 'admin') return null;
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/cms-login')) return null;
  if (!allowInsideModal && (pathname === '/' || pathname === '')) return null;

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`w-full flex flex-col items-center justify-center my-4 ${className}`}
    >
      <div className="rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80 p-2.5 sm:p-3 flex flex-col items-center gap-1.5 shadow-xs">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 select-none">
          Advertisement
        </span>
        <div className="w-[300px] h-[250px] overflow-hidden rounded-xl bg-neutral-200/40 dark:bg-neutral-950/60 flex items-center justify-center">
          {isMounted ? (
            <iframe
              title="Sponsored Advertisement"
              srcDoc={ADSTERRA_BANNER_SRCDOC}
              width={300}
              height={250}
              scrolling="no"
              frameBorder={0}
              className="w-[300px] h-[250px] border-0 overflow-hidden block"
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}
