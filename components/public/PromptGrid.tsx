'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptCard } from './PromptCard';
import { AIPersonalizedBanner } from './AIPersonalizedBanner';
import { SearchX, Filter, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { PromptPost } from '@/types/prompt';
import { PersonalizationEngine } from '@/lib/personalization';

const INITIAL_BATCH_SIZE = 10;
const SCROLL_BATCH_SIZE = 6;

export const PromptGrid = () => {
  const {
    posts,
    isLoadingPosts,
    searchQuery,
    setSearchQuery,
    aiSearchResults,
    isAiSearching,
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
      const hasAiMatches = aiSearchResults && aiSearchResults.query.toLowerCase() === q;
      const matchedIds = hasAiMatches ? new Set(aiSearchResults.matchedPostIds) : new Set<string>();
      const expandedTerms = hasAiMatches
        ? [
            aiSearchResults.correctedQuery.toLowerCase(),
            ...aiSearchResults.expandedKeywords.map((k) => k.toLowerCase()),
          ]
        : [];

      list = list.filter((p) => {
        // Direct ID match from Gemini AI semantic search
        if (matchedIds.has(p.id)) return true;

        // Exact query match on title, prompt text, category, tool, or tags
        const titleMatch = p.title?.toLowerCase().includes(q);
        const promptMatch = p.promptText?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const toolMatch = p.aiTool?.toLowerCase().includes(q);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));

        if (titleMatch || promptMatch || catMatch || toolMatch || tagMatch) {
          return true;
        }

        // Expanded semantic synonyms from Gemini
        if (expandedTerms.length > 0) {
          const title = p.title?.toLowerCase() || '';
          const prompt = p.promptText?.toLowerCase() || '';
          const tags = Array.isArray(p.tags) ? p.tags.map((t) => t.toLowerCase()) : [];
          return expandedTerms.some(
            (term) =>
              term.length >= 3 &&
              (title.includes(term) || prompt.includes(term) || tags.some((t) => t.includes(term)))
          );
        }

        return false;
      });

      // If AI produced ordered matchedPostIds, sort by relevance ranking
      if (hasAiMatches && aiSearchResults.matchedPostIds.length > 0) {
        const orderMap = new Map<string, number>();
        aiSearchResults.matchedPostIds.forEach((id, index) => orderMap.set(id, index));
        list = [...list].sort((a, b) => {
          const rankA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
          const rankB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
          return rankA - rankB;
        });
      }
    }

    // Sort: If on "For You" (all category and trending/default), apply AI personalization scoring
    if (selectedCategory === 'all' && !searchQuery.trim() && selectedSort === 'trending') {
      list = [...list].sort((a, b) => {
        const scoreA = PersonalizationEngine.scorePrompt(a, tasteProfile, bookmarkedIds).score;
        const scoreB = PersonalizationEngine.scorePrompt(b, tasteProfile, bookmarkedIds).score;
        return scoreB - scoreA;
      });
    } else if (!searchQuery.trim()) {
      if (selectedSort === 'trending') {
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
  }, [posts, selectedCategory, selectedTool, searchQuery, selectedSort, tasteProfile, bookmarkedIds, aiSearchResults]);

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
      { rootMargin: '250px' }
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

      {/* Gemini AI Smart Search Results Header */}
      {searchQuery.trim() && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E60023] via-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
              {isAiSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#E60023] dark:text-red-400">
                  Gemini AI Visual Search
                </span>
                {aiSearchResults?.isAiPowered && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                    Semantic Match
                  </span>
                )}
                {isAiSearching && (
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E60023] animate-ping" />
                    Analyzing concepts...
                  </span>
                )}
              </div>

              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                {aiSearchResults?.correctedQuery &&
                aiSearchResults.correctedQuery.toLowerCase() !== searchQuery.trim().toLowerCase() ? (
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span>Showing results for</span>
                    <span className="text-[#E60023] font-extrabold">
                      &ldquo;{aiSearchResults.correctedQuery}&rdquo;
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                      (interpreted from &ldquo;{searchQuery}&rdquo;)
                    </span>
                  </div>
                ) : (
                  <span>
                    Results for &ldquo;{searchQuery}&rdquo; ({filteredPosts.length} prompts)
                  </span>
                )}
              </div>

              {aiSearchResults?.explanation && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-2xl">
                  {aiSearchResults.explanation}
                </p>
              )}

              {aiSearchResults?.expandedKeywords && aiSearchResults.expandedKeywords.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-neutral-400">Concepts:</span>
                  {aiSearchResults.expandedKeywords.slice(0, 5).map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="self-end sm:self-center px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all shrink-0"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Masonry Image Grid */}
      {filteredPosts.length > 0 ? (
        <>
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [column-fill:_balance]">
            {visiblePosts.map((post, idx) => (
              <PromptCard key={post.id} post={post} priority={idx < 4} />
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
        /* Pinterest-Style Shimmer Skeleton Loading Grid for Viewport */
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
