'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { PromptCard } from './PromptCard';
import { PromptGridSkeleton } from './PromptCardSkeleton';
import { SearchX, Filter, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { PromptPost } from '@/types/prompt';
import { PersonalizationEngine } from '@/lib/personalization';
import { getPromptSlug } from '@/lib/utils';

const getInitialBatchSize = () => {
  if (typeof window === 'undefined') return 20;
  const width = window.innerWidth;
  const height = window.innerHeight;
  let cols = 4;
  if (width >= 1280) cols = 5;
  else if (width >= 1024) cols = 4;
  else if (width >= 640) cols = 3;
  else cols = 2;

  const rows = Math.max(3, Math.ceil(height / 260) + 1);
  return cols * rows;
};

const SCROLL_BATCH_SIZE = 20;

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
    isAiSearchEnabled,
    setIsAiSearchEnabled,
    aiSearchRemaining,
    isProUser,
    planTier,
    setIsProCheckoutModalOpen,
    showToast,
    userAccount,
    openAuthModal,
  } = useApp();

  // Mount state & fresh random shuffle map on initial load
  const [isMounted, setIsMounted] = useState<boolean>(true);
  const [randomOrderMap, setRandomOrderMap] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!posts || posts.length === 0) return map;

    try {
      if (typeof window !== 'undefined') {
        const cachedSessionIds = sessionStorage.getItem('promptcms_random_order_ids');
        if (cachedSessionIds) {
          const parsedIds: string[] = JSON.parse(cachedSessionIds);
          if (Array.isArray(parsedIds) && parsedIds.length > 0) {
            parsedIds.forEach((id, idx) => {
              map.set(id, idx);
            });
            posts.forEach((p) => {
              if (!map.has(p.id)) {
                map.set(p.id, map.size);
              }
            });
            return map;
          }
        }
      }
    } catch {}

    const postIds = posts.map((p) => p.id);
    for (let i = postIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [postIds[i], postIds[j]] = [postIds[j], postIds[i]];
    }

    postIds.forEach((id, idx) => {
      map.set(id, idx);
    });

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('promptcms_random_order_ids', JSON.stringify(postIds));
      }
    } catch {}

    return map;
  });
  const shuffleInitializedRef = useRef<boolean>(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentFilterKey = `${searchQuery}_${selectedCategory}_${selectedTool}_${selectedSort}_${tasteProfile.genderVibe}`;
  const [displayedCount, setDisplayedCount] = useState<number>(getInitialBatchSize);
  const [prevFilterKey, setPrevFilterKey] = useState<string>(currentFilterKey);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination if filter key changed during render
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setDisplayedCount(getInitialBatchSize());
  }

  // Filter only published posts for the public directory and strictly deduplicate with deterministic ordering
  const filteredPosts = useMemo(() => {
    let list = posts.filter((p) => p.status === 'published');

    if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'latest') {
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
    } else {
      const isRandomMode =
        !searchQuery.trim() &&
        selectedCategory !== 'latest' &&
        (!selectedCategory || selectedCategory === 'all') &&
        (selectedTool === 'all' || !selectedTool) &&
        selectedSort === 'newest';

      if (isRandomMode && randomOrderMap && randomOrderMap.size > 0) {
        // Default homepage view: Random prompts on initial load & reload until Latest or category is clicked
        list = [...list].sort((a, b) => {
          const rankA = randomOrderMap.get(a.id) ?? 999999;
          const rankB = randomOrderMap.get(b.id) ?? 999999;
          return rankA - rankB;
        });
      } else if (selectedCategory === 'latest' || selectedSort === 'newest') {
        // "Latest Prompts" filter button clicked or 'newest' sort selected: Always prioritize newest published posts first
        list = [...list].sort((a, b) => {
          const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
          const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
          if (timeB !== timeA && !isNaN(timeB) && !isNaN(timeA)) return timeB - timeA;
          return (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id);
        });
      } else if (selectedSort === 'oldest') {
        // Oldest first sort selected
        list = [...list].sort((a, b) => {
          const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
          const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
          if (timeB !== timeA && !isNaN(timeB) && !isNaN(timeA)) return timeA - timeB;
          return (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);
        });
      } else if (selectedSort === 'most-copied' || selectedSort === 'most-popular' || selectedSort === 'most-liked') {
        list = [...list].sort((a, b) => {
          const diff = (b.copiesCount || 0) - (a.copiesCount || 0);
          if (diff !== 0) return diff;
          return (b.createdAt || '').localeCompare(a.createdAt || '') || a.id.localeCompare(b.id);
        });
      } else {
        // Fallback newest
        list = [...list].sort((a, b) => {
          const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
          const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
          if (timeB !== timeA && !isNaN(timeB) && !isNaN(timeA)) return timeB - timeA;
          return (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id);
        });
      }
    }

    // Strict deduplication by post ID AND canonical slug to prevent any duplicate prompts from ever showing
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const uniqueList: PromptPost[] = [];

    for (const item of list) {
      if (!item || !item.id) continue;
      const slug = getPromptSlug(item);
      if (!seenIds.has(item.id) && !seenSlugs.has(slug)) {
        seenIds.add(item.id);
        seenSlugs.add(slug);
        uniqueList.push(item);
      }
    }

    return uniqueList;
  }, [posts, selectedCategory, selectedTool, searchQuery, selectedSort, aiSearchResults, randomOrderMap]);

  // Infinite Scroll: Dual-Layer (IntersectionObserver + Scroll Window Event)
  useEffect(() => {
    if (!isMounted || isLoadingPosts || displayedCount >= filteredPosts.length) return;

    const sentinel = bottomSentinelRef.current;
    let observer: IntersectionObserver | null = null;

    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setDisplayedCount((prev) => Math.min(prev + SCROLL_BATCH_SIZE, filteredPosts.length));
          }
        },
        { rootMargin: '800px 0px' }
      );
      observer.observe(sentinel);
    }

    const handleWindowScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight >= documentHeight - 1000) {
        setDisplayedCount((prev) => Math.min(prev + SCROLL_BATCH_SIZE, filteredPosts.length));
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [displayedCount, filteredPosts.length, isMounted, isLoadingPosts]);

  const visiblePosts = filteredPosts.slice(0, displayedCount);
  const hasMore = displayedCount < filteredPosts.length;

  const [columnCount, setColumnCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width >= 1280) return 5;
      if (width >= 1024) return 4;
      if (width >= 640) return 3;
      return 2;
    }
    return 4;
  });

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1280) {
        setColumnCount(5);
      } else if (width >= 1024) {
        setColumnCount(4);
      } else if (width >= 640) {
        setColumnCount(3);
      } else {
        setColumnCount(2);
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  // Partition visible posts into columns strictly by shortest-column-first vertical balancing.
  // This guarantees that:
  // 1. Both columns (on mobile) or all columns (on desktop) maintain balanced heights.
  // 2. Existing cards are NEVER moved or shuffled when new cards load below.
  // 3. New cards are strictly appended at the bottom vertically, eliminating the gap in the right column.
  const columns = useMemo(() => {
    const cols: PromptPost[][] = Array.from({ length: columnCount }, () => []);
    const colHeights: number[] = Array.from({ length: columnCount }, () => 0);

    for (let i = 0; i < visiblePosts.length; i++) {
      const post = visiblePosts[i];
      // Pick column with smallest accumulated height
      let targetCol = 0;
      let minH = colHeights[0];
      for (let c = 1; c < columnCount; c++) {
        if (colHeights[c] < minH) {
          minH = colHeights[c];
          targetCol = c;
        }
      }

      cols[targetCol].push(post);

      // Estimate card height: card has aspect ratio (height / width)
      const ratio = post.imageHeight && post.imageWidth ? post.imageHeight / post.imageWidth : 1.33;
      colHeights[targetCol] += ratio;
    }

    return cols;
  }, [visiblePosts, columnCount]);

  const totalPublishedCount = useMemo(() => {
    return posts.filter((p) => p.status === 'published').length;
  }, [posts]);

  return (
    <main id="prompts-grid-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 scroll-mt-20">
      {/* Gemini AI Smart Search Results Header */}
      {searchQuery.trim() && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E60023] via-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20 relative overflow-hidden">
              {isAiSearching ? (
                <div className="w-7 h-7 rounded-full overflow-hidden animate-spin flex items-center justify-center bg-white/20 p-0.5">
                  <Image src="/logo.png" alt="Logo" width={28} height={28} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#E60023] dark:text-red-400">
                  AI Visual Search
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

      {/* Visual Prompt Grid or Loading Skeleton */}
      {isLoadingPosts && posts.length === 0 ? (
        <PromptGridSkeleton />
      ) : filteredPosts.length > 0 ? (
        <>
          <div className="flex gap-3 sm:gap-4 items-start w-full animate-fade-in" id="vertical-masonry-feed">
            {columns.map((colPosts, colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-3 sm:gap-4 min-w-0">
                {colPosts.map((post, postIdx) => (
                  <PromptCard
                    key={post.id}
                    post={post}
                    priority={postIdx === 0}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Bottom Sentinel for Infinite Scroll */}
          <div ref={bottomSentinelRef} className="w-full h-10" />

          {/* Loading Indicator or Finished Message */}
          {hasMore ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5">
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-[#E60023]" />
                <span>Loading more prompts...</span>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedCount((prev) => Math.min(prev + SCROLL_BATCH_SIZE, filteredPosts.length))}
                className="text-xs font-bold text-[#E60023] hover:underline cursor-pointer bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 px-3.5 py-1.5 rounded-full border border-red-200 dark:border-red-900/40 transition-colors"
              >
                Load more prompts ({filteredPosts.length - displayedCount} remaining)
              </button>
            </div>
          ) : (
            <div className="text-center py-12 px-4 mt-6 border-t border-neutral-200/70 dark:border-neutral-800/70 max-w-md mx-auto">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                You&apos;ve reached the end of our prompt collection. Come back later for more posts.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 max-w-lg mx-auto shadow-sm">
          {totalPublishedCount === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
              You&apos;ve reached the end of our prompt collection. Come back later for more posts.
            </p>
          ) : searchQuery.trim() && !isAiSearchEnabled ? (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                no results for this term try using AI search
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const isLoggedIn = Boolean(userAccount && userAccount.isLoggedIn);
                    if (!isLoggedIn) {
                      showToast('Please log in to your account to use AI Search!');
                      openAuthModal('Please sign in or create a free account to use AI Search.');
                      return;
                    }
                    const isPaid = isProUser || ['starter', 'pro', 'vip'].includes(planTier) || Boolean(userAccount?.isProUser);
                    if (!isPaid) {
                      showToast('AI Search is an exclusive Pro feature. Upgrade to a paid plan to get 3 daily AI searches!');
                      setIsProCheckoutModalOpen(true);
                      return;
                    }
                    if (aiSearchRemaining <= 0) {
                      showToast('You have used your 3 daily AI searches for today. It will reset tomorrow!');
                      return;
                    }
                    setIsAiSearchEnabled(true);
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try AI Search</span>
                </button>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : searchQuery.trim() && aiSearchRemaining <= 0 ? (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                You have used your 3 daily AI searches. Your quota will reset tomorrow!
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all"
                >
                  Clear Search
                </button>
              </div>
            </div>
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
