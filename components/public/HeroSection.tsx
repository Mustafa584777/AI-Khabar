'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Search,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Flame,
  Star,
  Heart,
  Copy,
  Clock,
  Check,
  Sliders,
} from 'lucide-react';
import { getPromptSlug, getDynamicPopularTags, getOptimizedImageUrl } from '@/lib/utils';

export const HeroSection = () => {
  const {
    searchQuery,
    setSearchQuery,
    settings,
    setSelectedCategory,
    selectedSort,
    setSelectedSort,
    tasteProfile,
    setIsTasteModalOpen,
    setIsSearchModalOpen,
    categories,
    posts,
    setSelectedPost,
    popularSearchQueries,
    recordSearchQuery,
  } = useApp();

  const [isTrendingOpen, setIsTrendingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Automatically assign popular tags based on number of times they are used across posts
  const popularTags = useMemo(() => {
    return getDynamicPopularTags(posts, 7);
  }, [posts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTrendingOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    {
      id: 'trending' as const,
      label: 'Trending',
      icon: Flame,
      desc: 'Top engagement & copies',
    },
    {
      id: 'most-popular' as const,
      label: 'Most Popular',
      icon: Star,
      desc: 'Most viewed prompts',
    },
    {
      id: 'most-liked' as const,
      label: 'Most Liked',
      icon: Heart,
      desc: 'Highest community likes',
    },
    {
      id: 'most-copied' as const,
      label: 'Most Copied',
      icon: Copy,
      desc: 'Most copied prompts',
    },
    {
      id: 'newest' as const,
      label: 'Newest First',
      icon: Clock,
      desc: 'Recently published prompts',
    },
  ];

  const currentSortOption =
    sortOptions.find((opt) => opt.id === selectedSort) || sortOptions[0];
  const CurrentSortIcon = currentSortOption.icon;

  return (
    <section className="relative w-full max-w-4xl mx-auto pt-8 pb-4 px-4 sm:px-6 text-center">
      {/* Decorative Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E60023]/10 text-[#E60023] text-xs font-bold mb-5 animate-fade-in">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Curated Photo Prompt Library</span>
      </div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4 animate-fade-in [animation-delay:100ms]">
        {settings.heroHeadline || 'Trending Copy Paste Photo Prompts'}
      </h1>

      <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-8 animate-fade-in [animation-delay:200ms]">
        {settings.heroSubheadline ||
          'Explore 1,000+ curated photo prompts for Gemini and ChatGPT. Copy with 1 click.'}
      </p>

      {/* Action Bar: Search & Trending/Sort Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in [animation-delay:300ms]">
        {/* Pinterest Search Bar */}
        <div className="flex-1 relative group" ref={searchContainerRef}>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#E60023] transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Search prompts for aesthetics, cameras, or subjects..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#efefef] dark:bg-neutral-800 border-0 rounded-full text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]/40 placeholder:text-neutral-500 transition-all shadow-sm"
            id="hero-search-input"
          />

          {/* Search Suggestions & Most Viewed Categories Overlay (Matching Screenshot) */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 z-50 text-left max-h-[500px] overflow-y-auto space-y-6 animate-fade-in">
              {/* Most Searched Queries (Real User Search Queries) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-neutral-400 uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 text-[#E60023]" />
                    <span>Most Searched Queries (Real-Time)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setIsSearchModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#E60023] hover:underline"
                  >
                    Open Full Search
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(popularSearchQueries.length > 0
                    ? popularSearchQueries
                    : [
                        'Cyberpunk neon portrait',
                        'Cinematic golden hour',
                        'Minimalist aesthetic logo',
                        'Vintage 35mm film',
                        'Anime masterpiece',
                        'Hyperrealistic 8K model',
                      ]
                  ).map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => {
                        recordSearchQuery(query);
                        setSearchQuery(query);
                        setIsSearchOpen(false);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                    >
                      <Search className="w-3 h-3 opacity-60" />
                      <span>{query}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Most Viewed Categories with Image Previews (Screenshot layout) */}
              <div className="space-y-5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-wider block">
                  Most Viewed Categories
                </span>
                
                {categories.map((cat) => {
                  const catPosts = posts.filter(
                    (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                  ).slice(0, 4);

                  return (
                    <div key={cat.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSearchQuery('');
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center gap-1 text-sm font-black text-neutral-900 dark:text-white hover:text-[#E60023] transition-colors group"
                      >
                        <span>{cat.name}</span>
                        <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
                      </button>

                      {/* 4 Image Thumbnails Row */}
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {catPosts.length > 0 ? (
                          catPosts.map((post) => (
                            <div
                              key={post.id}
                              onClick={() => {
                                setSelectedPost(post);
                                if (typeof window !== 'undefined') {
                                  window.history.pushState({ postId: post.id }, '', `/prompt/${getPromptSlug(post)}`);
                                }
                                setIsSearchOpen(false);
                              }}
                              className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 cursor-pointer group shadow-xs hover:shadow-md transition-all"
                            >
                              <Image
                                src={getOptimizedImageUrl(post.imageUrl, 200)}
                                alt={post.title}
                                fill
                                sizes="80px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-[10px] font-bold text-white truncate">
                                  {post.title}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          [1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="aspect-square rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 font-bold"
                            >
                              Preview
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Sort & Trending Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsTrendingOpen(!isTrendingOpen)}
            className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-5 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full text-sm font-bold shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
            id="trending-sort-dropdown-btn"
          >
            <div className="flex items-center gap-2">
              <CurrentSortIcon className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              <span>{currentSortOption.label}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isTrendingOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isTrendingOpen && (
            <div className="absolute top-full right-0 mt-2 w-full sm:w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 animate-scale-in">
              <ul className="text-left divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {/* Sort Options */}
                <li className="p-1">
                  <span className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-neutral-400 dark:text-neutral-500 block">
                    Sort & Discovery
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedSort === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setSelectedSort(opt.id);
                            setIsTrendingOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-[#E60023] font-bold'
                              : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={`w-3.5 h-3.5 ${
                                isSelected
                                  ? 'text-[#E60023]'
                                  : 'text-neutral-500 dark:text-neutral-400'
                              }`}
                            />
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#E60023]" />}
                        </button>
                      );
                    })}
                  </div>
                </li>

                {/* Quick Explorer Popular Tags */}
                {popularTags.length > 0 && (
                  <li className="p-1 pt-2">
                    <span className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-neutral-400 dark:text-neutral-500 block">
                      Popular Themes
                    </span>
                    <div className="space-y-0.5 mt-1">
                      {popularTags.slice(0, 6).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSearchQuery(tag);
                            setSelectedCategory('all');
                            setIsTrendingOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 rounded-xl transition-colors truncate"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Quick Chips Container */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8 animate-fade-in [animation-delay:400ms]">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mr-1">
          Popular:
        </span>
        {popularTags.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setSearchQuery(tag);
              setSelectedCategory('all');
            }}
            className={`px-4 py-1.5 rounded-full border text-[11px] font-bold transition-all shadow-xs ${
              searchQuery.toLowerCase() === tag.toLowerCase()
                ? 'bg-[#E60023] border-[#E60023] text-white'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-[#E60023] hover:text-[#E60023]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
};
