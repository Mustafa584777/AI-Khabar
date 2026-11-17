'use client';

import React from 'react';
import { Sparkles, Wand2, Crown, Eraser, AlertTriangle, X } from 'lucide-react';
import { PromptCardSkeleton } from './PromptCardSkeleton';

export type SkeletonKind =
  | 'watermark'
  | 'studio'
  | 'dashboard'
  | 'pricing'
  | 'prompt'
  | 'feed'
  | 'article';

export function resolveSkeletonKind(targetUrl: string): {
  kind: SkeletonKind;
  defaultLabel: string;
} {
  const path = (targetUrl || '/').split('?')[0].toLowerCase();

  if (path.startsWith('/free-gemini-watermark-remover-online')) {
    return { kind: 'watermark', defaultLabel: 'Loading Free Gemini Watermark Remover...' };
  }
  if (path.startsWith('/prompt-editor')) {
    return { kind: 'studio', defaultLabel: 'Opening AI Prompt Editor...' };
  }
  if (path.startsWith('/create')) {
    return { kind: 'studio', defaultLabel: 'Opening AI Studio Tools...' };
  }
  if (path.startsWith('/dashboard')) {
    return { kind: 'dashboard', defaultLabel: 'Loading Creator Dashboard...' };
  }
  if (path.startsWith('/pricing') || path.startsWith('/checkout')) {
    return { kind: 'pricing', defaultLabel: 'Loading Pro Plans...' };
  }
  if (
    path.startsWith('/notifications') ||
    path.startsWith('/about') ||
    path.startsWith('/contact') ||
    path.startsWith('/privacy-policy') ||
    path.startsWith('/terms') ||
    path.startsWith('/disclaimer') ||
    path.startsWith('/cancellation-refund') ||
    path.startsWith('/ai-policy') ||
    path.startsWith('/auth')
  ) {
    return { kind: 'article', defaultLabel: 'Loading Page...' };
  }
  if (path === '/' || path === '') {
    return { kind: 'feed', defaultLabel: 'Loading Prompts...' };
  }
  return { kind: 'prompt', defaultLabel: 'Opening Prompt Card...' };
}

const ShimmerBlock = ({ className = '' }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-neutral-200/90 dark:bg-neutral-800/90 ${className}`}>
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 dark:via-white/10 to-transparent animate-shimmer" />
  </div>
);

interface SmartRouteSkeletonProps {
  targetUrl?: string;
  label?: string;
  isSlow?: boolean;
  onDismiss?: () => void;
  isFullScreenOverlay?: boolean;
}

export const SmartRouteSkeleton: React.FC<SmartRouteSkeletonProps> = ({
  targetUrl = '/',
  label,
  isSlow = false,
  onDismiss,
  isFullScreenOverlay = true,
}) => {
  const { kind, defaultLabel } = resolveSkeletonKind(targetUrl);
  const statusLabel = label || defaultLabel;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
      id="smart-route-loading-skeleton"
      className={`${
        isFullScreenOverlay
          ? 'fixed inset-0 z-[95] overflow-y-auto'
          : 'min-h-screen w-full'
      } bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col`}
    >
      {/* Top Animated Gradient Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[3.5px] bg-neutral-200/50 dark:bg-neutral-800/60 overflow-hidden pointer-events-none">
        <div className="h-full w-2/3 bg-gradient-to-r from-[#E60023] via-pink-500 to-violet-500 animate-shimmer shadow-sm shadow-pink-500/40" />
      </div>

      {/* Header Skeleton matching sticky top nav */}
      <div className="sticky top-0 z-30 w-full bg-white/95 dark:bg-neutral-950/95 border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex items-center gap-2">
              <ShimmerBlock className="w-20 h-9 rounded-full" />
              <ShimmerBlock className="w-24 h-9 rounded-full" />
              <ShimmerBlock className="hidden lg:block w-28 h-9 rounded-full" />
            </div>
          </div>
          <ShimmerBlock className="hidden md:block flex-1 max-w-md h-10 rounded-full" />
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-20 h-9 rounded-full" />
            <ShimmerBlock className="w-16 h-9 rounded-full" />
            <ShimmerBlock className="hidden sm:block w-24 h-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Route-Aware Smart Skeleton Body */}
      <div className="flex-1 w-full">
        {kind === 'watermark' && (
          <div className="w-full pb-16">
            {/* Sub-header studio bar */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
                <ShimmerBlock className="w-28 h-7 rounded-full" />
                <div className="flex items-center gap-2">
                  <ShimmerBlock className="w-32 h-7 rounded-full" />
                  <ShimmerBlock className="hidden sm:block w-28 h-7 rounded-full" />
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
              {/* Studio Tabs Skeleton */}
              <div className="flex items-center gap-6 border-b border-neutral-200 dark:border-neutral-800 pb-3 overflow-hidden">
                <ShimmerBlock className="w-32 h-5 rounded-lg shrink-0" />
                <ShimmerBlock className="w-28 h-5 rounded-lg shrink-0" />
                <ShimmerBlock className="w-40 h-5 rounded-lg shrink-0" />
                <div className="flex items-center gap-2 pb-1 border-b-2 border-pink-500 shrink-0">
                  <Eraser className="w-4 h-4 text-pink-500 animate-pulse" />
                  <ShimmerBlock className="w-44 h-5 rounded-lg" />
                </div>
              </div>

              {/* Watermark Hero Section Skeleton */}
              <div className="max-w-4xl mx-auto text-center space-y-4 pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 to-violet-500/15 border border-pink-400/30 text-pink-500 text-xs font-bold">
                  <Wand2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>100% Free &bull; Zero Upload &bull; 3 AI Engines</span>
                </div>
                <ShimmerBlock className="h-9 sm:h-11 w-4/5 max-w-xl mx-auto rounded-2xl" />
                <ShimmerBlock className="h-4 w-5/6 max-w-2xl mx-auto rounded-lg" />
                <ShimmerBlock className="h-4 w-2/3 max-w-lg mx-auto rounded-lg" />
              </div>

              {/* Main Upload Dropzone Card Skeleton */}
              <div className="max-w-5xl mx-auto rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-pink-500/35 p-6 sm:p-10 shadow-xl space-y-6">
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-400/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-pink-500 animate-spin" />
                  </div>
                  <ShimmerBlock className="h-6 w-64 rounded-xl" />
                  <ShimmerBlock className="h-4 w-80 max-w-full rounded-lg" />
                  <ShimmerBlock className="h-11 w-48 rounded-2xl mt-2" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <ShimmerBlock className="h-20 rounded-2xl" />
                  <ShimmerBlock className="h-20 rounded-2xl" />
                  <ShimmerBlock className="h-20 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {kind === 'studio' && (
          <div className="w-full pb-16">
            <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
                <ShimmerBlock className="w-28 h-7 rounded-full" />
                <div className="flex items-center gap-2">
                  <ShimmerBlock className="w-36 h-7 rounded-full" />
                  <ShimmerBlock className="hidden sm:block w-28 h-7 rounded-full" />
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
              <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-6 h-6 text-[#E60023] animate-pulse" />
                  <ShimmerBlock className="h-8 w-72 max-w-full rounded-xl" />
                </div>
                <ShimmerBlock className="h-4 w-96 max-w-full rounded-lg" />
              </div>

              <div className="flex gap-5 border-b border-neutral-200 dark:border-neutral-800 pb-3 overflow-hidden">
                <ShimmerBlock className="w-32 h-5 rounded-lg shrink-0" />
                <ShimmerBlock className="w-28 h-5 rounded-lg shrink-0" />
                <ShimmerBlock className="w-40 h-5 rounded-lg shrink-0" />
                <ShimmerBlock className="w-44 h-5 rounded-lg shrink-0" />
              </div>

              {/* Dual-column Studio Workspace Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4">
                  <ShimmerBlock className="h-56 w-full rounded-2xl" />
                  <div className="grid grid-cols-3 gap-2">
                    <ShimmerBlock className="h-10 rounded-xl" />
                    <ShimmerBlock className="h-10 rounded-xl" />
                    <ShimmerBlock className="h-10 rounded-xl" />
                  </div>
                  <ShimmerBlock className="h-12 w-full rounded-2xl" />
                </div>
                <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <ShimmerBlock className="h-6 w-44 rounded-lg" />
                    <ShimmerBlock className="h-8 w-24 rounded-full" />
                  </div>
                  <ShimmerBlock className="h-44 w-full rounded-2xl" />
                  <div className="flex gap-3">
                    <ShimmerBlock className="h-10 w-32 rounded-full" />
                    <ShimmerBlock className="h-10 w-36 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {kind === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <ShimmerBlock className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0" />
                <div className="space-y-2">
                  <ShimmerBlock className="w-40 h-5 rounded-lg" />
                  <ShimmerBlock className="w-28 h-3.5 rounded-lg" />
                  <ShimmerBlock className="w-24 h-5 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
                {[0, 1, 2].map((i) => (
                  <ShimmerBlock key={i} className="h-16 min-w-[92px] rounded-2xl" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              {[0, 1, 2].map((i) => (
                <ShimmerBlock key={i} className="w-32 h-10 rounded-full shrink-0" />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <PromptCardSkeleton key={i} index={i} />
              ))}
            </div>
          </div>
        )}

        {kind === 'pricing' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold">
                <Crown className="w-4 h-4 animate-pulse" />
                <span>Zeena Prompt Pro Plans</span>
              </div>
              <ShimmerBlock className="h-10 w-80 max-w-full mx-auto rounded-2xl" />
              <ShimmerBlock className="h-4 w-96 max-w-full mx-auto rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`rounded-3xl p-6 sm:p-8 bg-white dark:bg-neutral-900 border ${
                    idx === 1
                      ? 'border-amber-500/50 shadow-xl'
                      : 'border-neutral-200 dark:border-neutral-800'
                  } space-y-5`}
                >
                  <ShimmerBlock className="h-6 w-28 rounded-lg" />
                  <ShimmerBlock className="h-10 w-36 rounded-xl" />
                  <ShimmerBlock className="h-4 w-full rounded-lg" />
                  <div className="space-y-2.5 pt-2">
                    {[0, 1, 2, 3].map((row) => (
                      <ShimmerBlock key={row} className="h-4 w-5/6 rounded-lg" />
                    ))}
                  </div>
                  <ShimmerBlock className="h-12 w-full rounded-full mt-4" />
                </div>
              ))}
            </div>
          </div>
        )}

        {kind === 'prompt' && (
          <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10">
            {/* Master Prompt Card Skeleton (Split Image + Prompt Details) */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] sm:rounded-[36px] shadow-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 flex items-center justify-center">
                  <ShimmerBlock className="w-full aspect-[4/3] sm:aspect-[3/4] max-h-[68vh] rounded-2xl" />
                </div>
                <div className="lg:col-span-5 p-5 sm:p-8 lg:p-9 flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800">
                      <ShimmerBlock className="h-7 w-32 rounded-full" />
                      <div className="flex items-center gap-2">
                        <ShimmerBlock className="h-9 w-20 rounded-full" />
                        <ShimmerBlock className="h-9 w-9 rounded-full" />
                      </div>
                    </div>
                    <ShimmerBlock className="h-8 w-5/6 rounded-xl" />
                    <div className="flex flex-wrap gap-2">
                      <ShimmerBlock className="h-6 w-20 rounded-full" />
                      <ShimmerBlock className="h-6 w-24 rounded-full" />
                      <ShimmerBlock className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/70 dark:border-neutral-800 space-y-2.5">
                      <ShimmerBlock className="h-4 w-full rounded-lg" />
                      <ShimmerBlock className="h-4 w-11/12 rounded-lg" />
                      <ShimmerBlock className="h-4 w-4/5 rounded-lg" />
                      <ShimmerBlock className="h-4 w-3/4 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <ShimmerBlock className="h-12 rounded-2xl" />
                    <ShimmerBlock className="h-12 rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Related Prompts Grid Skeleton */}
            <div className="space-y-4">
              <ShimmerBlock className="h-6 w-52 rounded-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PromptCardSkeleton key={i} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {kind === 'feed' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="text-center space-y-3 py-2">
              <ShimmerBlock className="h-9 sm:h-11 w-80 max-w-full mx-auto rounded-2xl" />
              <ShimmerBlock className="h-4 w-96 max-w-full mx-auto rounded-lg" />
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <ShimmerBlock key={i} className="w-24 h-9 rounded-full shrink-0" />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <PromptCardSkeleton key={i} index={i} />
              ))}
            </div>
          </div>
        )}

        {kind === 'article' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
            <ShimmerBlock className="h-9 w-72 max-w-full rounded-2xl" />
            <ShimmerBlock className="h-4 w-96 max-w-full rounded-lg" />
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3"
                >
                  <ShimmerBlock className="h-5 w-48 rounded-lg" />
                  <ShimmerBlock className="h-4 w-full rounded-lg" />
                  <ShimmerBlock className="h-4 w-4/5 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Smart Status Pill at Bottom */}
      {isFullScreenOverlay && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[105] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-900/95 dark:bg-neutral-800/95 text-white border border-white/15 shadow-2xl backdrop-blur-md max-w-[92vw]">
          {isSlow ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          ) : (
            <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <span className="text-xs font-bold truncate">
            {isSlow ? 'Still loading page (slow network)...' : statusLabel}
          </span>
          {isSlow && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="ml-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Dismiss</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
