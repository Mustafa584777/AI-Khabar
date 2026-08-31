'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Bookmark,
  BookOpen,
  User,
  Sparkles,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    bookmarkedIds,
    setIsBookmarksDrawerOpen,
    currentView,
    setCurrentView,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    setIsSearchModalOpen,
  } = useApp();

  const handleHomeClick = () => {
    setCurrentView('public');
    setSelectedCategory('all');
    setSearchQuery('');
    if (pathname !== '/') {
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Icon & Navigation Pills */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={handleHomeClick}
            className="flex items-center group focus:outline-none p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            id="brand-logo-btn"
            title="Trending Copy Paste Photo Prompts"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0 relative bg-gradient-to-tr from-[#E60023] via-[#ff3b56] to-[#E60023] flex items-center justify-center p-0.5">
              <Image
                src="/logo.png"
                alt="tool.reelz"
                width={38}
                height={38}
                className="w-full h-full object-cover rounded-full"
                priority
              />
            </div>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleHomeClick}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                currentView === 'public' && selectedCategory === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#efefef] dark:hover:bg-neutral-800'
              }`}
            >
              Home
            </button>

            {/* AI Studio / Create Tool Button */}
            <button
              onClick={() => {
                setCurrentView('studio-tool');
                if (pathname !== '/') {
                  router.push('/');
                }
              }}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                currentView === 'studio-tool'
                  ? 'bg-[#E60023] text-white shadow-sm'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#E60023]'
              }`}
              id="header-create-tool-btn"
              title="AI Studio - Create Prompt from Image & Image from Prompt"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Studio</span>
            </button>

            <Link
              href="/blog"
              className="hidden lg:flex px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-[#efefef] dark:hover:bg-neutral-800 transition-colors items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-[#E60023]" />
              <span>Explore Guides</span>
            </Link>
          </nav>
        </div>

        {/* Center: Search Trigger Bar (Desktop & Mobile) */}
        <div className="flex-1 max-w-md hidden md:flex items-center">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e4e4e4] dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-medium transition-all group"
            id="header-search-trigger-btn"
            title="Search prompts, categories, and tags"
          >
            <Search className="w-4 h-4 text-neutral-400 group-hover:text-[#E60023] transition-colors" />
            <span className="truncate">
              {searchQuery ? `Searching: "${searchQuery}"` : 'Search for ideas, prompts, subjects...'}
            </span>
          </button>
        </div>

        {/* Right: Saved, Account & Admin Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Saved Prompts (Pinterest Red Pill) */}
          <button
            onClick={() => setIsBookmarksDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-sm transition-all transform active:scale-95"
            title="View Saved Prompts"
            id="header-bookmarks-btn"
          >
            <Bookmark className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Saved</span>
            {bookmarkedIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-[#E60023] text-[11px] font-black">
                {bookmarkedIds.length}
              </span>
            )}
          </button>

          {/* User Profile / Dashboard Button */}
          <button
            onClick={() => {
              setCurrentView('user-dashboard');
              if (pathname !== '/') {
                router.push('/');
              }
            }}
            className={`p-2 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
              currentView === 'user-dashboard'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'bg-[#efefef] dark:bg-neutral-800 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
            }`}
            title="My Creative Dashboard"
            id="header-user-dashboard-btn"
          >
            <User className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};

