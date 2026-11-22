'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Edit3,
  Eraser,
  History,
  Wand2,
  Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { startRouteNavigation } from '@/lib/navigation';
import { WatermarkRemoverTool } from '@/components/public/WatermarkRemoverTool';

export const WatermarkStudioShell = () => {
  const router = useRouter();
  const {
    setCurrentView,
    setSelectedCategory,
    setSearchQuery,
    userAccount,
  } = useApp();

  const navigateStudioTab = (tab: 'reverse' | 'generator' | 'editor', label: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_tab', tab);
    }
    startRouteNavigation('/create', label);
    router.push('/create');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-12">
      {/* Top Sticky Studio Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setCurrentView('public');
              if (setSelectedCategory) setSelectedCategory('all');
              if (setSearchQuery) setSearchQuery('');
              startRouteNavigation('/', 'Loading Prompt Feed...');
              router.push('/');
            }}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:text-[#E60023] dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] dark:text-red-400 text-xs font-black">
              100% Free • Offline
            </span>

            {userAccount?.isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('user-dashboard');
                  startRouteNavigation('/dashboard', 'Loading Creator Dashboard...');
                  router.push('/dashboard');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white hover:text-[#E60023] px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#E60023]" />
                <span>View History</span>
              </button>
            )}

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E60023] text-white text-xs font-black">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>AI Studio Lab</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Studio Tabs Navigation */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-px overflow-x-auto">
          <div className="flex gap-6 whitespace-nowrap">
            <button
              type="button"
              onClick={() => navigateStudioTab('reverse', 'Opening Image-to-Prompt Studio...')}
              className="pb-4 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Image to Prompt</span>
            </button>
            <button
              type="button"
              onClick={() => navigateStudioTab('generator', 'Opening Prompt Generator...')}
              className="pb-4 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>Idea to Prompt</span>
            </button>
            <button
              type="button"
              onClick={() => navigateStudioTab('editor', 'Opening AI Prompt Editor...')}
              className="pb-4 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#E60023]" />
              <span>AI Prompt Editor &amp; Modifier</span>
            </button>
            <Link
              href="/free-gemini-watermark-remover-online"
              prefetch={false}
              className="pb-4 text-xs sm:text-sm font-bold border-b-2 border-[#E60023] text-[#E60023] dark:text-red-400 transition-all flex items-center gap-2"
            >
              <Eraser className="w-4 h-4 text-[#E60023]" />
              <span>Free Gemini Watermark Remover</span>
            </Link>
          </div>
        </div>

        <div className="py-2">
          <WatermarkRemoverTool />
        </div>
      </div>
    </div>
  );
};
