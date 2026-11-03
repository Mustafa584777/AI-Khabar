'use client';

import React from 'react';

// Preset natural aspect ratios to match Pinterest-style masonry variation
const SKELETON_RATIOS = [
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-[9/16]',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-[3/4]',
];

export const PromptCardSkeleton = ({ index = 0 }: { index?: number }) => {
  const ratioClass = SKELETON_RATIOS[index % SKELETON_RATIOS.length];

  return (
    <div
      className={`relative w-full ${ratioClass} rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs animate-pulse flex flex-col justify-between p-3 sm:p-4`}
    >
      {/* Top simulated badge/pill */}
      <div className="flex items-center justify-between w-full">
        <div className="w-14 sm:w-18 h-4 sm:h-5 rounded-full bg-neutral-300 dark:bg-neutral-700/80" />
        <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-neutral-300/60 dark:bg-neutral-700/60" />
      </div>

      {/* Center subtle shimmer placeholder */}
      <div className="w-full flex-1" />

      {/* Bottom simulated title lines and copy button */}
      <div className="space-y-2 pt-2">
        <div className="w-3/4 h-3 sm:h-3.5 rounded-md bg-neutral-300 dark:bg-neutral-700/90" />
        <div className="w-1/2 h-2.5 sm:h-3 rounded-md bg-neutral-300/70 dark:bg-neutral-700/60" />
        <div className="flex items-center justify-between pt-1">
          <div className="w-16 h-3 rounded-md bg-neutral-300/60 dark:bg-neutral-700/50" />
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-300 dark:bg-neutral-700/80" />
        </div>
      </div>
    </div>
  );
};

export const PromptGridSkeleton = ({ count = 12 }: { count?: number }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" id="prompts-grid-skeleton">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 items-start w-full">
        {Array.from({ length: count }).map((_, idx) => (
          <PromptCardSkeleton key={idx} index={idx} />
        ))}
      </div>
    </div>
  );
};
