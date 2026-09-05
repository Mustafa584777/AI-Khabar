'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Home, Search, Plus, User, Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface BottomNavProps {
  onSearchClick?: () => void;
}

export const BottomNav = ({ onSearchClick }: BottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    selectedCategory,
    setSelectedCategory,
    setSelectedSort,
    setSearchQuery,
    isAuthenticated,
    currentView,
    setCurrentView,
    setIsTasteModalOpen,
    setIsSearchModalOpen,
  } = useApp();

  const handleHomeClick = () => {
    setCurrentView('public');
    setSelectedCategory('all');
    setSearchQuery('');
    if (pathname !== '/') {
      router.push('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      setIsSearchModalOpen(true);
    }
  };

  const handleForYouClick = () => {
    setCurrentView('for-you');
    setSelectedCategory('all');
    setSelectedSort('trending');
    setSearchQuery('');
    if (pathname !== '/') {
      router.push('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateStudioClick = () => {
    setCurrentView('studio-tool');
    if (pathname !== '/') {
      router.push('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAccountClick = () => {
    setCurrentView('user-dashboard');
    router.push('/dashboard');
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-200/70 dark:border-neutral-800/70 py-1.5 px-4 flex sm:hidden items-center justify-around shadow-2xl transition-all"
    >
      {/* 1. Home Button */}
      <button
        onClick={handleHomeClick}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          currentView === 'public' && selectedCategory === 'all'
            ? 'text-[#E60023] scale-105 font-bold'
            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
        }`}
        title="Home Feed"
        id="bottom-nav-home"
      >
        <Home className={`w-6 h-6 ${currentView === 'public' && selectedCategory === 'all' ? 'fill-current' : ''}`} />
        <span className="text-[10px] mt-0.5 font-medium">Home</span>
      </button>

      {/* 2. Explore & Categories Button */}
      <button
        onClick={handleSearchClick}
        className="flex flex-col items-center justify-center p-2 rounded-2xl text-neutral-500 hover:text-[#E60023] dark:hover:text-white transition-all duration-200"
        title="Explore Categories"
        id="bottom-nav-explore"
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] mt-0.5 font-medium">Explore</span>
      </button>

      {/* 3. AI Studio / Create (+) Button (Prominent Center/Action) */}
      <button
        onClick={handleCreateStudioClick}
        className={`flex flex-col items-center justify-center p-1.5 transition-all duration-200 ${
          currentView === 'studio-tool' ? 'scale-110' : 'hover:scale-105'
        }`}
        title="AI Studio - Image to Prompt & Prompt to Image"
        id="bottom-nav-create-tool"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            currentView === 'studio-tool'
              ? 'bg-[#E60023] text-white shadow-red-500/40 ring-2 ring-red-400'
              : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-[#E60023]'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className={`text-[10px] mt-0.5 font-black ${currentView === 'studio-tool' ? 'text-[#E60023]' : 'text-neutral-600 dark:text-neutral-400'}`}>
          Create
        </span>
      </button>

      {/* 4. For You Personalized Feed Button */}
      <button
        onClick={handleForYouClick}
        id="bottom-nav-for-you"
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          currentView === 'for-you'
            ? 'text-[#E60023] scale-105 font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="Personalized For You Feed"
      >
        <Sparkles className="w-6 h-6 text-[#E60023]" />
        <span className="text-[10px] mt-0.5 font-medium">For You</span>
      </button>

      {/* 5. Account / Profile Button */}
      <button
        onClick={handleAccountClick}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          pathname === '/dashboard' || currentView === 'user-dashboard'
            ? 'text-[#E60023] font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="My Creative Dashboard"
        id="bottom-nav-account"
      >
        <User className={`w-6 h-6 ${pathname === '/dashboard' || currentView === 'user-dashboard' ? 'fill-current' : ''}`} />
        <span className="text-[10px] mt-0.5 font-medium">Dashboard</span>
      </button>
    </nav>
  );
};

