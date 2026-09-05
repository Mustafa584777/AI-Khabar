'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Search,
  X,
  TrendingUp,
  Flame,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  ChevronRight,
  Eye,
  Tag,
} from 'lucide-react';
import { Category, PromptPost } from '@/types/prompt';
import { getPromptSlug, getOptimizedImageUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export const SearchExploreModal = () => {
  const router = useRouter();
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    searchQuery,
    setSearchQuery,
    categories,
    posts,
    popularSearchQueries,
    recordSearchQuery,
    performAiSearch,
    setSelectedCategory,
    setSelectedPost,
    copyPromptToClipboard,
    setCurrentView,
  } = useApp();

  const [localInput, setLocalInput] = useState(searchQuery || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalAiResult, setModalAiResult] = useState<any>(null);
  const [isModalSearching, setIsModalSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isSearchModalOpen);
  if (isSearchModalOpen !== prevIsOpen) {
    setPrevIsOpen(isSearchModalOpen);
    if (isSearchModalOpen) {
      setLocalInput(searchQuery || '');
    }
  }

  // Debounced AI Search for Modal
  useEffect(() => {
    const q = localInput.trim();
    if (q.length < 2) {
      setModalAiResult(null);
      setIsModalSearching(false);
      return;
    }
    setIsModalSearching(true);
    const timer = setTimeout(() => {
      performAiSearch(q).then((res) => {
        setModalAiResult(res);
        setIsModalSearching(false);
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [localInput, performAiSearch]);

  // Handle focus and body scroll lock when modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isSearchModalOpen]);

  // Handle closing modal
  const handleClose = () => {
    setIsSearchModalOpen(false);
  };

  // Handle submitting search
  const handleExecuteSearch = (queryToRun: string) => {
    const trimmed = queryToRun.trim();
    if (trimmed) {
      recordSearchQuery(trimmed);
      setSearchQuery(trimmed);
      setSelectedCategory('all');
    }
    setCurrentView('public');
    setIsSearchModalOpen(false);
  };

  // Handle Category Click
  const handleCategorySelect = (catName: string) => {
    setSelectedCategory(catName);
    setSearchQuery('');
    setCurrentView('public');
    setIsSearchModalOpen(false);
  };

  // Calculate Most Viewed Categories with their top visual image
  const mostViewedCategories = useMemo(() => {
    const publishedPosts = posts.filter((p) => p.status === 'published');

    const catWithStats = categories.map((cat) => {
      const catPosts = publishedPosts.filter(
        (p) => p.category?.toLowerCase() === cat.name?.toLowerCase()
      );

      // Sort by viewsCount desc
      const sortedPosts = [...catPosts].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
      const totalViews = catPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
      const topImage = sortedPosts[0]?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';

      return {
        ...cat,
        totalViews,
        topImage,
        postCount: catPosts.length,
        posts: sortedPosts.slice(0, 4),
      };
    });

    // Sort categories by totalViews desc, then by count
    return catWithStats.sort((a, b) => b.totalViews - a.totalViews || b.postCount - a.postCount);
  }, [categories, posts]);

  // Live Instant Search Filter Results (with Gemini AI semantic fallback & sorting)
  const liveResults = useMemo(() => {
    const query = localInput.trim().toLowerCase();
    if (!query || query.length < 2) return [];

    const published = posts.filter((p) => p.status === 'published');
    const hasAiMatches = modalAiResult && modalAiResult.query?.toLowerCase() === query;
    const matchedIds = hasAiMatches ? new Set<string>(modalAiResult.matchedPostIds || []) : new Set<string>();
    const expandedTerms = hasAiMatches
      ? [
          (modalAiResult.correctedQuery || '').toLowerCase(),
          ...(Array.isArray(modalAiResult.expandedKeywords) ? modalAiResult.expandedKeywords : []).map((k: string) => k.toLowerCase()),
        ].filter(Boolean)
      : [];

    const matches = published.filter((post) => {
      // Direct ID match from Gemini AI
      if (matchedIds.has(post.id)) return true;

      // Exact keyword match
      const titleMatch = post.title?.toLowerCase().includes(query);
      const promptMatch = post.promptText?.toLowerCase().includes(query);
      const catMatch = post.category?.toLowerCase().includes(query);
      const tagMatch = Array.isArray(post.tags) && post.tags.some((t) => t.toLowerCase().includes(query));
      const toolMatch = post.aiTool?.toLowerCase().includes(query);
      if (titleMatch || promptMatch || catMatch || tagMatch || toolMatch) return true;

      // Semantic expanded terms
      if (expandedTerms.length > 0) {
        const title = post.title?.toLowerCase() || '';
        const prompt = post.promptText?.toLowerCase() || '';
        const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.toLowerCase()) : [];
        return expandedTerms.some(
          (term) =>
            term.length >= 3 &&
            (title.includes(term) || prompt.includes(term) || tags.some((t) => t.includes(term)))
        );
      }

      return false;
    });

    if (hasAiMatches && matchedIds.size > 0) {
      const orderMap = new Map<string, number>();
      (modalAiResult.matchedPostIds || []).forEach((id: string, idx: number) => orderMap.set(id, idx));
      return [...matches].sort((a, b) => {
        const rankA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const rankB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return rankA - rankB;
      });
    }

    return matches;
  }, [localInput, posts, modalAiResult]);

  const handleCopyPrompt = (e: React.MouseEvent, post: PromptPost) => {
    e.stopPropagation();
    copyPromptToClipboard(post.promptText, post.id);
    setCopiedId(post.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col justify-start animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container */}
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-neutral-950 min-h-screen sm:min-h-0 sm:max-h-[92vh] sm:my-auto sm:rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col overflow-hidden">
        
        {/* 1. Header Search Bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shrink-0 flex items-center gap-3">
          <button
            onClick={handleClose}
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            title="Close Search"
            aria-label="Close Search"
          >
            <ArrowLeft className="w-5 h-5 sm:hidden" />
            <X className="w-5 h-5 hidden sm:block" />
          </button>

          {/* Search Input Box */}
          <div className="flex-1 relative flex items-center">
            <div className="absolute left-4 pointer-events-none text-neutral-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteSearch(localInput);
                }
                if (e.key === 'Escape') {
                  handleClose();
                }
              }}
              placeholder="Search prompts for aesthetics, cameras, or subjects..."
              className="w-full pl-12 pr-10 py-3 bg-[#f0f0f0] dark:bg-neutral-800/90 text-neutral-900 dark:text-white rounded-full text-sm font-semibold placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] transition-all"
              id="search-explore-modal-input"
            />
            {localInput && (
              <button
                type="button"
                onClick={() => setLocalInput('')}
                className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                title="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {localInput && (
            <button
              type="button"
              onClick={() => handleExecuteSearch(localInput)}
              className="hidden sm:inline-flex px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md transition-all shrink-0"
            >
              Search
            </button>
          )}
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-7">
          {/* A. If user typed a search query: Show Live Results */}
          {localInput.trim().length >= 2 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 text-[#E60023]" />
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                    Live Search Results ({liveResults.length})
                  </h3>
                  {modalAiResult?.isAiPowered && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      Gemini AI Powered
                    </span>
                  )}
                  {isModalSearching && (
                    <span className="text-xs text-neutral-400 animate-pulse">
                      Analyzing semantics...
                    </span>
                  )}
                </div>
                {liveResults.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch(localInput)}
                    className="text-xs font-bold text-[#E60023] hover:underline flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>View all in feed</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* AI Semantic query interpretation banner */}
              {modalAiResult?.correctedQuery &&
                modalAiResult.correctedQuery.toLowerCase() !== localInput.trim().toLowerCase() && (
                  <div className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
                      <span>
                        Showing visual results for <strong className="text-[#E60023]">&ldquo;{modalAiResult.correctedQuery}&rdquo;</strong> (understood from &ldquo;{localInput}&rdquo;)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalInput(modalAiResult.correctedQuery);
                        handleExecuteSearch(modalAiResult.correctedQuery);
                      }}
                      className="text-[11px] font-bold underline shrink-0 hover:text-black dark:hover:text-white"
                    >
                      Use this query
                    </button>
                  </div>
                )}

              {liveResults.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    No prompts matching &ldquo;{localInput}&rdquo;
                  </p>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Try searching for different terms like <em>35mm portrait</em>, <em>cyberpunk</em>, or select a category below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {liveResults.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        setSelectedPost(post);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({ postId: post.id }, '', `/prompt/${getPromptSlug(post)}`);
                        }
                        setIsSearchModalOpen(false);
                      }}
                      className="group relative rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 cursor-pointer shadow-xs hover:shadow-xl transition-all"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-square w-full overflow-hidden bg-neutral-800">
                        <Image
                          src={getOptimizedImageUrl(post.imageUrl, 250) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                        {/* Quick Copy Button on hover */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyPrompt(e, post)}
                          className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-[#E60023] text-white backdrop-blur-sm opacity-90 transition-all shadow-md active:scale-95"
                          title="Copy Prompt"
                        >
                          {copiedId === post.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Post Info */}
                      <div className="p-2.5 space-y-1">
                        <span className="text-[10px] font-bold text-[#E60023] line-clamp-1">
                          {post.category}
                        </span>
                        <p className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1 leading-snug">
                          {post.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* B. Real User Search Queries (Requirement 3) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-neutral-800 dark:text-neutral-200 tracking-wide">
              <Flame className="w-4 h-4 text-[#E60023]" />
              <span>Popular Prompts</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {popularSearchQueries.map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => handleExecuteSearch(query)}
                  className="px-3.5 py-2 rounded-full bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all duration-150 flex items-center gap-2 group shadow-2xs hover:shadow-md"
                >
                  <Search className="w-3 h-3 text-neutral-400 group-hover:text-white transition-colors" />
                  <span>{query}</span>
                </button>
              ))}
            </div>
          </div>

          {/* C. "Ideas for you" - Most Viewed Categories Grid (Matching Screenshots) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-neutral-800 dark:text-neutral-200 tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Ideas for you (Most Viewed Categories)</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-medium">
                {mostViewedCategories.length} categories
              </span>
            </div>

            {/* Pinterest-Style Visual Category Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mostViewedCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.name)}
                  className="group relative h-32 sm:h-36 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 transform active:scale-95"
                >
                  {/* Category Image from its Most Viewed Prompt */}
                  <Image
                    src={getOptimizedImageUrl(cat.topImage, 300)}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />

                  {/* Dark Vignette Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 group-hover:from-black/75 transition-colors" />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-end">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white/90">
                        {cat.postCount} prompts
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-red-200 transition-colors drop-shadow-sm leading-tight">
                        {cat.name}
                      </h4>
                      {cat.totalViews > 0 && (
                        <p className="text-[10px] text-white/70 font-medium flex items-center gap-1 mt-0.5">
                          <Eye className="w-3 h-3" />
                          <span>{cat.totalViews.toLocaleString()} views</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
