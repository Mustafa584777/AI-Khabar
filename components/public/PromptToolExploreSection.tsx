'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost } from '@/types/prompt';
import { detectPostAspectRatio, getOptimizedImageUrl, getPromptSlug } from '@/lib/utils';
import { pushPromptHistoryState } from '@/lib/navigation';
import { warmPromptDetailModalChunk, preloadAndCacheImageUrl } from '@/lib/viewport-cache';
import {
  Search,
  Sparkles,
  Copy,
  Check,
  Bookmark,
  Crown,
  Wand2,
  Camera,
  Edit3,
  X,
  Compass,
  ChevronDown,
} from 'lucide-react';

export type ExploreToolMode = 'reverse' | 'generator' | 'editor';

interface PromptToolExploreSectionProps {
  mode: ExploreToolMode;
  onUseInTool?: (post: PromptPost) => void;
}

const INITIAL_SHOW_COUNT = 15;
const LOAD_STEP = 15;

export const PromptToolExploreSection = ({
  mode,
  onUseInTool,
}: PromptToolExploreSectionProps) => {
  const {
    posts,
    categories,
    ensureFullCatalogLoaded,
    setSelectedPost,
    copyPromptToClipboard,
    bookmarkedIds,
    toggleBookmark,
    isPromptUnlocked,
    isProUser,
    userAccount,
    openAuthModal,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_SHOW_COUNT);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [columnCount, setColumnCount] = useState<number>(2);
  const [measuredRatios, setMeasuredRatios] = useState<Record<string, number>>({});

  // Load full prompt catalog in background so native Explore works seamlessly on tool pages
  useEffect(() => {
    void ensureFullCatalogLoaded();
  }, [ensureFullCatalogLoaded]);

  // Responsive column count matching main Explore feed (2 / 3 / 4 / 5 cols)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqXl = window.matchMedia('(min-width: 1280px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqSm = window.matchMedia('(min-width: 640px)');

    const updateCols = () => {
      if (mqXl.matches) setColumnCount(5);
      else if (mqLg.matches) setColumnCount(4);
      else if (mqSm.matches) setColumnCount(3);
      else setColumnCount(2);
    };

    updateCols();
    mqXl.addEventListener('change', updateCols);
    mqLg.addEventListener('change', updateCols);
    mqSm.addEventListener('change', updateCols);
    return () => {
      mqXl.removeEventListener('change', updateCols);
      mqLg.removeEventListener('change', updateCols);
      mqSm.removeEventListener('change', updateCols);
    };
  }, []);

  const handleAspectRatioResolved = useCallback((postId: string, heightOverWidth: number) => {
    if (!postId || !isFinite(heightOverWidth) || heightOverWidth <= 0) return;
    setMeasuredRatios((prev) => {
      const existing = prev[postId];
      if (existing && Math.abs(existing - heightOverWidth) < 0.01) return prev;
      return { ...prev, [postId]: heightOverWidth };
    });
  }, []);

  const availableCategories = useMemo(() => {
    const published = (posts || []).filter((p) => p && p.status === 'published' && p.category);
    const countMap = new Map<string, number>();
    published.forEach((p) => {
      const cat = p.category.trim();
      countMap.set(cat, (countMap.get(cat) || 0) + 1);
    });

    const ordered = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    if (ordered.length === 0 && Array.isArray(categories)) {
      return categories.slice(0, 8).map((c) => c.name);
    }
    return ordered.slice(0, 10);
  }, [posts, categories]);

  const filteredPosts = useMemo(() => {
    const published = (posts || []).filter((p) => p && p.status === 'published' && p.imageUrl);
    let list = published;

    if (localCategory !== 'all') {
      list = list.filter((p) => (p.category || '').toLowerCase() === localCategory.toLowerCase());
    }

    const q = localSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.promptText || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Deduplicate cleanly by ID + slug
    const seen = new Set<string>();
    const unique: PromptPost[] = [];
    for (const item of [...list].sort((a, b) => {
      const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
      const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    })) {
      const slug = getPromptSlug(item);
      if (!seen.has(item.id) && !seen.has(slug)) {
        seen.add(item.id);
        seen.add(slug);
        unique.push(item);
      }
    }
    return unique;
  }, [posts, localCategory, localSearch]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  // Shortest-column greedy masonry preserving original aspect ratios
  const masonryColumns = useMemo(() => {
    const cols: PromptPost[][] = Array.from({ length: columnCount }, () => []);
    const colHeights = new Array<number>(columnCount).fill(0);

    visiblePosts.forEach((post) => {
      let shortestIdx = 0;
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < colHeights[shortestIdx]) shortestIdx = i;
      }

      let ratio = measuredRatios[post.id];
      if (!ratio) {
        const parts = detectPostAspectRatio(post).split('/').map((n) => parseFloat(n.trim()));
        ratio = parts.length === 2 && parts[0] > 0 && parts[1] > 0 ? parts[1] / parts[0] : 1.333;
      }

      cols[shortestIdx].push(post);
      colHeights[shortestIdx] += ratio + 0.14;
    });

    return cols;
  }, [visiblePosts, columnCount, measuredRatios]);

  const handleOpenPrompt = (e: React.MouseEvent, post: PromptPost) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    setSelectedPost(post);
    pushPromptHistoryState(post.id, getPromptSlug(post));
  };

  const handleUseButtonClick = (e: React.MouseEvent, post: PromptPost) => {
    e.preventDefault();
    e.stopPropagation();
    const isUnlocked = isPromptUnlocked(post.id, post.isPremium);
    if (mode !== 'reverse' && !isUnlocked) {
      setSelectedPost(post);
      pushPromptHistoryState(post.id, getPromptSlug(post));
      return;
    }
    if (onUseInTool) {
      onUseInTool(post);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleQuickCopy = (e: React.MouseEvent, post: PromptPost) => {
    e.preventDefault();
    e.stopPropagation();
    const isUnlocked = isPromptUnlocked(post.id, post.isPremium);
    if (!isUnlocked) {
      setSelectedPost(post);
      pushPromptHistoryState(post.id, getPromptSlug(post));
      return;
    }
    copyPromptToClipboard(post.promptText, post.id);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleBookmarkClick = (e: React.MouseEvent, post: PromptPost) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to save prompts.');
      return;
    }
    toggleBookmark(post.id);
  };

  const actionLabel =
    mode === 'reverse' ? 'Extract Photo' : mode === 'generator' ? 'Remix Idea' : 'Edit Prompt';

  const ActionIcon = mode === 'reverse' ? Camera : mode === 'generator' ? Wand2 : Edit3;

  return (
    <section
      aria-labelledby={`explore-prompts-heading-${mode}`}
      className="pt-8 border-t border-neutral-200 dark:border-neutral-800 space-y-5"
      id={`explore-prompts-section-${mode}`}
    >
      {/* Header + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E60023]">
            <Compass className="w-4 h-4 shrink-0" />
            <span>Prompt Library</span>
          </div>
          <h2
            id={`explore-prompts-heading-${mode}`}
            className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight"
          >
            Explore Prompts
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Browse trending AI prompts directly on this page—click any card to inspect full settings, or load it straight into the tool above.
          </p>
        </div>

        {/* Native Search Box */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setVisibleCount(INITIAL_SHOW_COUNT);
            }}
            placeholder="Search explore prompts..."
            aria-label="Search explore prompts"
            className="w-full pl-10 pr-9 py-2.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023]/50"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setLocalCategory('all');
            setVisibleCount(INITIAL_SHOW_COUNT);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            localCategory === 'all'
              ? 'bg-[#E60023] text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          All Prompts
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setLocalCategory(cat);
              setVisibleCount(INITIAL_SHOW_COUNT);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              localCategory === cat
                ? 'bg-[#E60023] text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry Prompt Feed */}
      {visiblePosts.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-[#E60023] mx-auto" />
          <p className="text-sm font-bold text-neutral-900 dark:text-white">
            No matching prompts found
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Try clearing your search or choosing another category.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 sm:gap-4 w-full">
          {masonryColumns.map((colPosts, colIdx) => (
            <div key={colIdx} className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">
              {colPosts.map((post) => {
                const slug = getPromptSlug(post);
                const imgUrl = getOptimizedImageUrl(post.imageUrl, 360);
                const isUnlocked = isPromptUnlocked(post.id, post.isPremium);
                const isBookmarked = bookmarkedIds.includes(post.id);
                const ratio = measuredRatios[post.id]
                  ? `${1} / ${measuredRatios[post.id]}`
                  : detectPostAspectRatio(post);

                return (
                  <article
                    key={post.id}
                    className="group relative rounded-[20px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs hover:shadow-xl transition-shadow select-none"
                    onMouseEnter={() => {
                      warmPromptDetailModalChunk();
                      preloadAndCacheImageUrl(post.imageUrl, 800);
                    }}
                  >
                    <a
                      href={`/${slug}`}
                      onClick={(e) => handleOpenPrompt(e, post)}
                      style={{ aspectRatio: ratio }}
                      aria-label={`${post.title} - Open Prompt`}
                      className="block relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                    >
                      {post.isPremium && (
                        <div
                          className={`absolute top-2.5 left-2.5 z-20 flex items-center justify-center w-7 h-7 rounded-full shadow-lg pointer-events-none ${
                            isUnlocked && !isProUser
                              ? 'bg-emerald-950/90 border border-emerald-400/60 text-emerald-300'
                              : 'bg-black/85 border border-amber-400/60 text-amber-300'
                          }`}
                        >
                          <Crown
                            className={`w-3.5 h-3.5 ${
                              isUnlocked && !isProUser
                                ? 'fill-emerald-400 text-emerald-400'
                                : 'fill-amber-400 text-amber-400'
                            }`}
                          />
                        </div>
                      )}

                      <img
                        src={imgUrl}
                        alt={post.imageAlt || post.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                            handleAspectRatioResolved(post.id, img.naturalHeight / img.naturalWidth);
                          }
                        }}
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                      />

                      {/* Hover Desktop Actions */}
                      <div className="hidden sm:flex absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2 px-3 z-10">
                        {onUseInTool && (
                          <button
                            type="button"
                            onClick={(e) => handleUseButtonClick(e, post)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <ActionIcon className="w-3.5 h-3.5" />
                            <span>{actionLabel}</span>
                          </button>
                        )}
                        {isUnlocked && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickCopy(e, post)}
                            className="flex items-center gap-1 px-3 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                            title="Copy Prompt"
                          >
                            {copiedId === post.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedId === post.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                        {userAccount?.isLoggedIn && (
                          <button
                            type="button"
                            onClick={(e) => handleBookmarkClick(e, post)}
                            aria-label="Save prompt"
                            className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-lg flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <Bookmark
                              className={`w-4 h-4 ${
                                isBookmarked ? 'fill-[#E60023] text-[#E60023]' : 'text-neutral-800'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </a>

                    {/* Compact Footer Strip for Quick Mobile/Desktop Tool Integration */}
                    <div className="p-2.5 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <a
                        href={`/${slug}`}
                        onClick={(e) => handleOpenPrompt(e, post)}
                        className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 truncate hover:text-[#E60023] transition-colors flex-1 min-w-0"
                      >
                        {post.title}
                      </a>
                      {onUseInTool && (
                        <button
                          type="button"
                          onClick={(e) => handleUseButtonClick(e, post)}
                          className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] hover:bg-[#E60023] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {actionLabel}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Load More Pagination */}
      {hasMore && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + LOAD_STEP)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-[#E60023] dark:hover:bg-[#E60023] dark:hover:text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <span>Explore More Prompts</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};
