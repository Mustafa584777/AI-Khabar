'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptCard } from './PromptCard';
import { AIPersonalizedBanner } from './AIPersonalizedBanner';
import { SearchX, Filter, Loader2 } from 'lucide-react';
import { PromptPost } from '@/types/prompt';
import { PersonalizationEngine } from '@/lib/personalization';

const INITIAL_BATCH_SIZE = 6;
const SCROLL_BATCH_SIZE = 6;

export const PromptGrid = () => {
  const {
    posts,
    isLoadingPosts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTool,
    setSelectedTool,
    selectedSort,
    tasteProfile,
    bookmarkedIds,
  } = useApp();

  const currentFilterKey = `${searchQuery}_${selectedCategory}_${selectedTool}_${selectedSort}_${tasteProfile.genderVibe}`;
  const [displayedCount, setDisplayedCount] = useState<number>(INITIAL_BATCH_SIZE);
  const [prevFilterKey, setPrevFilterKey] = useState<string>(currentFilterKey);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination if filter key changed during render
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setDisplayedCount(INITIAL_BATCH_SIZE);
  }

  // Filter only published posts for the public directory and strictly deduplicate
  const filteredPosts = useMemo(() => {
    let list = posts.filter((p) => p.status === 'published');

    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedTool && selectedTool !== 'all') {
      list = list.filter(
        (p) => p.aiTool.toLowerCase() === selectedTool.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.promptText.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.aiTool.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort: If on "For You" (all category and trending/default), apply AI personalization scoring
    if (selectedCategory === 'all' && !searchQuery.trim() && selectedSort === 'trending') {
      list = [...list].sort((a, b) => {
        const scoreA = PersonalizationEngine.scorePrompt(a, tasteProfile, bookmarkedIds).score;
        const scoreB = PersonalizationEngine.scorePrompt(b, tasteProfile, bookmarkedIds).score;
        return scoreB - scoreA;
      });
    } else if (selectedSort === 'trending') {
      list = [...list].sort((a, b) => (b.copiesCount || 0) + (b.viewsCount || 0) - ((a.copiesCount || 0) + (a.viewsCount || 0)));
    } else if (selectedSort === 'most-popular') {
      list = [...list].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else if (selectedSort === 'most-liked') {
      list = [...list].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (selectedSort === 'most-copied') {
      list = [...list].sort((a, b) => (b.copiesCount || 0) - (a.copiesCount || 0));
    } else if (selectedSort === 'newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Deduplication by post ID
    const seenIds = new Set<string>();
    const uniqueList: PromptPost[] = [];

    for (const item of list) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }

    return uniqueList;
  }, [posts, selectedCategory, selectedTool, searchQuery, selectedSort, tasteProfile, bookmarkedIds]);

  // Infinite Scroll Observer
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayedCount((prev) => Math.min(prev + SCROLL_BATCH_SIZE, filteredPosts.length));
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPosts.length]);

  const visiblePosts = filteredPosts.slice(0, displayedCount);
  const hasMore = displayedCount < filteredPosts.length;

  const totalPublishedCount = useMemo(() => {
    return posts.filter((p) => p.status === 'published').length;
  }, [posts]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* AI Personalized Smart Feed Banner (When on "For You" Feed) */}
      {selectedCategory === 'all' && !searchQuery.trim() && (
        <AIPersonalizedBanner />
      )}

      {/* Masonry Image Grid */}
      {filteredPosts.length > 0 ? (
        <>
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [column-fill:_balance]">
            {visiblePosts.map((post) => (
              <PromptCard key={post.id} post={post} />
            ))}
          </div>

          {/* Bottom Sentinel for Infinite Scroll */}
          <div ref={bottomSentinelRef} className="w-full h-10" />

          {/* Loading Indicator or Finished Message */}
          {hasMore ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-neutral-500 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-[#E60023]" />
              <span>Loading more visual pins...</span>
            </div>
          ) : (
            <div className="text-center py-12 px-4 mt-6 border-t border-neutral-200/70 dark:border-neutral-800/70 max-w-md mx-auto">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                You&apos;ve reached the end of our prompt collection. Come back later for more posts.
              </p>
            </div>
          )}
        </>
      ) : isLoadingPosts ? (
        /* Pinterest-Style Shimmer Skeleton Loading Grid for Slow Internet */
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [column-fill:_balance]">
          {[
            'aspect-[3/4]',
            'aspect-[4/5]',
            'aspect-[9/16]',
            'aspect-[3/4]',
            'aspect-[1/1]',
            'aspect-[4/5]',
            'aspect-[3/4]',
            'aspect-[9/16]',
            'aspect-[4/5]',
            'aspect-[3/4]',
            'aspect-[1/1]',
            'aspect-[4/5]',
          ].map((aspect, idx) => (
            <div
              key={idx}
              className="break-inside-avoid mb-4 rounded-[20px] sm:rounded-[24px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs relative select-none animate-pulse"
            >
              <div className={`w-full ${aspect} bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden flex flex-col justify-between p-3.5`}>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-4 rounded-full bg-neutral-300/80 dark:bg-neutral-700/80" />
                  <div className="w-7 h-7 rounded-full bg-neutral-300/80 dark:bg-neutral-700/80" />
                </div>
                <div className="space-y-1.5">
                  <div className="w-3/4 h-3.5 rounded-md bg-neutral-300/70 dark:bg-neutral-700/70" />
                  <div className="w-1/2 h-2.5 rounded-md bg-neutral-300/50 dark:bg-neutral-700/50" />
                </div>
                {/* Shimmer wave effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent animate-shimmer pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 max-w-lg mx-auto shadow-sm">
          {totalPublishedCount === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
              You&apos;ve reached the end of our prompt collection. Come back later for more posts.
            </p>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                <SearchX className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                No Prompts Found
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                We couldn&apos;t find any prompts matching your active search or category filters. Try resetting your filters to explore all prompts.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedTool('all');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Reset All Filters</span>
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
};
