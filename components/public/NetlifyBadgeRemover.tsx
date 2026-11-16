'use client';

import { useEffect } from 'react';

export const NetlifyBadgeRemover = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Targeted idle cleanup without expensive MutationObserver or getComputedStyle reflows
    const purgeNetlifyBadges = () => {
      const selectors = [
        'netlify-drawer',
        '[data-netlify-drawer]',
        '[data-netlify-badge]',
        '[data-netlify-feedback]',
        '#netlify-badge',
        '.netlify-badge',
        'iframe[src*="netlify"]',
        'a[href*="netlify.com"]',
      ];
      for (const selector of selectors) {
        try {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        } catch {}
      }
    };

    if (typeof (window as any).requestIdleCallback === 'function') {
      const id = (window as any).requestIdleCallback(purgeNetlifyBadges, { timeout: 2500 });
      return () => {
        if (typeof (window as any).cancelIdleCallback === 'function') {
          (window as any).cancelIdleCallback(id);
        }
      };
    }

    const timer = window.setTimeout(purgeNetlifyBadges, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
};
