'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Sparkles, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const PROMO_ITEMS = [
  'Unlock premium prompts at ₹99/Year',
  'Unlock All PRO Prompts',
  'Bulk Upload in Watermark Remover',
  '120 Prompt Tool Credits',
  'No Watermark Text on Copied Prompts',
  'AI Search (3 Daily Searches)',
  'Unlimited Saves & History',
];

export const PromoMarqueeBar = () => {
  const { isActivePremiumUser } = useApp();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated && isActivePremiumUser) {
    return null;
  }

  return (
    <div
      className="promo-marquee-container w-full h-8 bg-neutral-950 dark:bg-black text-white border-b border-neutral-800 overflow-hidden select-none relative z-30"
      role="region"
      aria-label="Pro Yearly Offer Promotion"
    >
      <Link
        href="/pricing"
        prefetch={false}
        className="flex items-center h-full w-max animate-promo-marquee focus:outline-none"
        title="Unlock all premium prompts & Pro Yearly benefits at ₹99/Year"
      >
        {[0, 1].map((loopIdx) => (
          <div
            key={loopIdx}
            aria-hidden={loopIdx === 1 ? 'true' : undefined}
            className="flex items-center gap-6 px-4 shrink-0 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-400">
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{PROMO_ITEMS[0]}</span>
            </span>

            {PROMO_ITEMS.slice(1).map((benefit, idx) => (
              <React.Fragment key={idx}>
                <span className="text-neutral-600" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1 text-neutral-200">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{benefit}</span>
                </span>
              </React.Fragment>
            ))}

            <span className="text-neutral-600" aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1 font-bold text-rose-400">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Upgrade Now</span>
            </span>
          </div>
        ))}
      </Link>
    </div>
  );
};
