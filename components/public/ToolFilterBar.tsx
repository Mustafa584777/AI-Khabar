'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles } from 'lucide-react';
import { getCategoryIcon } from '@/lib/icons';
import { PersonalizationEngine } from '@/lib/personalization';

const emptySubscribe = () => () => {};
const useIsMounted = () => React.useSyncExternalStore(emptySubscribe, () => true, () => false);

export const ToolFilterBar = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    selectedSort,
    setSelectedSort,
    categories,
    categoryPostCounts,
    tasteProfile,
  } = useApp();

  const isMounted = useIsMounted();

  // Filter out categories with fewer than 5 prompts in O(categories)
  const categoriesWithMinPrompts = useMemo(() => {
    return categories.filter((cat) => {
      const count = categoryPostCounts[cat.name.toLowerCase().trim()] || 0;
      return count >= 5;
    });
  }, [categories, categoryPostCounts]);

  // Dynamically reorder categories based on user's active AI engagement affinities after client mount
  const personalizedCategories = useMemo(() => {
    if (!isMounted) return categoriesWithMinPrompts;
    return PersonalizationEngine.getPersonalizedCategoryOrder(categoriesWithMinPrompts, tasteProfile);
  }, [categoriesWithMinPrompts, tasteProfile, isMounted]);

  const isLatestActive = selectedCategory === 'latest' || selectedSort === 'newest';

  return (
    <div id="categories-filter-bar" className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-2 scroll-mt-20">
      <div className="flex items-center gap-2">
        {/* Style Pill Tabs Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar flex-1 scroll-smooth">
          {/* 1. "Latest Prompts" Filter Button (Unselected by default, activates only on user click) */}
          <button
            type="button"
            onClick={() => {
              if (isLatestActive) {
                setSelectedCategory('');
                setSelectedSort('random');
              } else {
                setSelectedCategory('latest');
                setSelectedSort('newest');
              }
            }}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer ${
              isLatestActive
                ? 'bg-[#E60023] text-white shadow-sm shadow-[#E60023]/30 scale-100'
                : 'bg-[#efefef] dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Latest Prompts</span>
          </button>

          {/* AI Ranked Personalized Category Tabs */}
          {personalizedCategories.map((cat) => {
            const isSelected =
              Boolean(selectedCategory) &&
              selectedCategory !== 'latest' &&
              selectedCategory.toLowerCase() === cat.name.toLowerCase();
            const affinityScore = tasteProfile.categoryAffinities[cat.name] || 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedCategory('');
                  } else {
                    if (selectedCategory === 'latest') {
                      setSelectedSort('random');
                    }
                    setSelectedCategory(cat.name);
                  }
                }}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer ${
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
