'use client';

import React from 'react';
import { PromptCardSkeleton } from './PromptCardSkeleton';

export const DashboardSkeleton = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-pulse" id="dashboard-skeleton">
      {/* Profile Header Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="space-y-2">
            <div className="w-36 h-5 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div className="w-24 h-3.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/70" />
            <div className="w-28 h-5 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60" />
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 min-w-[90px] text-center space-y-1">
              <div className="w-10 h-4 mx-auto rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="w-12 h-2.5 mx-auto rounded bg-neutral-200 dark:bg-neutral-700/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-28 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
        ))}
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <PromptCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
};
