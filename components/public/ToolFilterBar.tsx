'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Flame, Sliders, Sparkles, Bell } from 'lucide-react';
import { getCategoryIcon } from '@/lib/icons';
import { PersonalizationEngine } from '@/lib/personalization';

const emptySubscribe = () => () => {};
const useIsMounted = () => React.useSyncExternalStore(emptySubscribe, () => true, () => false);

export const ToolFilterBar = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    categories,
    selectedSort,
    setSelectedSort,
    tasteProfile,
    setIsTasteModalOpen,
    setIsNotificationsDrawerOpen,
    unreadNotificationsCount,
  } = useApp();

  const isMounted = useIsMounted();

  // Dynamically reorder categories based on user's active AI engagement affinities after client mount
  const personalizedCategories = useMemo(() => {
    if (!isMounted) return categories;
    return PersonalizationEngine.getPersonalizedCategoryOrder(categories, tasteProfile);
  }, [categories, tasteProfile, isMounted]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-2">
      <div className="flex items-center gap-2">
        {/* Pinterest Style Pill Tabs Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar flex-1 scroll-smooth">
          {/* 1. Notifications Tab (Replaces For You as requested) */}
          <button
            onClick={() => {
              setIsNotificationsDrawerOpen(true);
            }}
            id="filter-bar-notifications-tab"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-[#E60023] border border-red-200/80 dark:border-red-900/50 active:scale-95"
            title="Personalized Updates & Push Notifications"
          >
            <Bell className="w-3.5 h-3.5 fill-current" />
            <span>Notifications</span>
            {unreadNotificationsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#E60023] text-white text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* 2. All Feed Tab */}
          <button
            onClick={() => {
              setSelectedCategory('all');
            }}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm scale-100'
                : 'bg-[#efefef] dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700'
            }`}
          >
            <span>All Prompts</span>
          </button>

          {/* 3. "Trending" Tab */}
          <button
            onClick={() => {
              setSelectedSort('trending');
            }}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              selectedSort === 'trending' && selectedCategory === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-[#efefef] dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#E60023]" />
            <span>Trending</span>
          </button>

          {/* 3. AI Ranked Personalized Category Tabs */}
          {personalizedCategories.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase() === cat.name.toLowerCase();
            const affinityScore = tasteProfile.categoryAffinities[cat.name] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
                  isSelected
                    ? 'bg-[#E60023] text-white shadow-sm shadow-[#E60023]/30'
                    : 'bg-[#efefef] dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700'
                }`}
              >
                {getCategoryIcon(cat.iconName, { className: 'w-3.5 h-3.5' })}
                <span>{cat.name}</span>
                {affinityScore >= 6 && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60023]" title="High interest match" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
