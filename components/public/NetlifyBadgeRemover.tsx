'use client';

import { useEffect } from 'react';

export const NetlifyBadgeRemover = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const purgeNetlifyBadges = () => {
      // 1. Check direct query selectors
      const selectors = [
        'netlify-drawer',
        '[data-netlify-drawer]',
        '[data-netlify-badge]',
        '[data-netlify-feedback]',
        '#netlify-badge',
        '.netlify-badge',
        'iframe[src*="netlify"]',
        'a[href*="netlify.com"]',
        '[aria-label*="Netlify" i]',
        '[title*="Netlify" i]',
      ];

      selectors.forEach((selector) => {
        try {
          const els = document.querySelectorAll(selector);
          els.forEach((el) => {
            el.remove();
          });
        } catch {}
      });

      // 2. Scan elements that contain "Powered by Netlify" or "Netlify"
      const allCandidates = document.querySelectorAll('button, div, span, a, footer');
      allCandidates.forEach((el) => {
        const text = el.textContent || '';
        if (text.includes('Powered by Netlify')) {
          const target = el.closest('div[style*="fixed"], div[style*="absolute"], div') || el;
          target.remove();
        } else if (
          text.includes('Netlify') &&
          el.className &&
          typeof el.className === 'string' &&
          el.className.toLowerCase().includes('netlify')
        ) {
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' || style.position === 'absolute') {
            el.remove();
          }
        }
      });
    };

    purgeNetlifyBadges();

    // Observe future DOM injections (Netlify injects badge dynamically after page load)
    const observer = new MutationObserver(() => {
      purgeNetlifyBadges();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Also run scheduled cleanups for delayed injections
    const t1 = setTimeout(purgeNetlifyBadges, 400);
    const t2 = setTimeout(purgeNetlifyBadges, 1200);
    const t3 = setTimeout(purgeNetlifyBadges, 2500);
    const t4 = setTimeout(purgeNetlifyBadges, 5000);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return null;
};
