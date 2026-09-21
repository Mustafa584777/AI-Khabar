'use client';

import React from 'react';
import { PromptGrid } from './PromptGrid';
import { AIPersonalizedBanner } from './AIPersonalizedBanner';

export function RequestedPromptsFeed() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <AIPersonalizedBanner />
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Personalized Smart Feed</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Curated AI prompts tailored to your taste profile and favorite tools.
        </p>
      </div>
      <PromptGrid />
    </div>
  );
}
