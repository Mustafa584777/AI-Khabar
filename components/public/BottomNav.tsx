'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Home, Search, Plus, User, Bell } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationService } from '@/lib/notifications';

import Link from 'next/link';

interface BottomNavProps {
  onSearchClick?: () => void;
}

export const BottomNav = ({ onSearchClick }: BottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();
  
  const {
    currentView,
    setCurrentView,
    selectedCategory,
    setSelectedCategory,
    setSelectedSort,
    setSearchQuery,
    userAccount,
    setIsSearchModalOpen,
  } = useApp();

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Eagerly prefetch routes for fallback client cache
  useEffect(() => {
    try {
      router.prefetch('/');
      router.prefetch('/create');
      router.prefetch('/notifications');
      router.prefetch('/dashboard');
    } catch {}
  }, [router]);

  useEffect(() => {
    const updateUnread = () => {
      const list = NotificationService.getNotifications();
      setUnreadNotifs(list.filter((n) => !n.read).length);
    };
    updateUnread();
    const interval = setInterval(updateUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHomeActive = currentView === 'public' || currentView === 'for-you' || (pathname === '/' && !currentView);
  const isCreateActive = currentView === 'studio-tool' || pathname === '/create';
  const isNotifsActive = currentView === 'notifications' || pathname === '/notifications';
  const isDashboardActive = currentView === 'user-dashboard' || pathname === '/dashboard';

  const handleNav = (
    e: React.MouseEvent,
    targetView: 'public' | 'studio-tool' | 'notifications' | 'user-dashboard',
    targetPath: string
  ) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();

    // If on an external/slug route, use client router to return to target
    if (pathname !== '/' && pathname !== '/create' && pathname !== '/dashboard' && pathname !== '/notifications') {
      router.push(targetPath);
      return;
    }

    if (targetView === 'public') {
      setSelectedSort('newest');
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setCurrentView(targetView);
  };

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      setIsSearchModalOpen(true);
    }
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-200/70 dark:border-neutral-800/70 py-1.5 px-4 flex sm:hidden items-center justify-around shadow-2xl transition-all"
    >
      {/* 1. Home Button (Instant local cache switch) */}
      <a
        href="/"
        onClick={(e) => handleNav(e, 'public', '/')}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer ${
          isHomeActive
            ? 'text-[#E60023] scale-105 font-bold'
            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
        }`}
        title="Home Feed"
        id="bottom-nav-home"
      >
        <Home className={`w-6 h-6 ${isHomeActive ? 'text-[#E60023] fill-[#E60023]' : ''}`} />
        <span className={`text-[10px] mt-0.5 ${isHomeActive ? 'text-[#E60023] font-bold' : 'font-medium'}`}>Home</span>
      </a>

      {/* 2. Explore & Categories Button */}
      <button
        type="button"
        onClick={handleSearchClick}
        className="flex flex-col items-center justify-center p-2 rounded-2xl text-neutral-500 hover:text-[#E60023] dark:hover:text-white transition-all duration-200 cursor-pointer"
        title="Explore Categories"
        id="bottom-nav-explore"
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] mt-0.5 font-medium">Explore</span>
      </button>

      {/* 3. Create (+) Button (Instant local cache switch) */}
      <a
        href="/create"
        onClick={(e) => handleNav(e, 'studio-tool', '/create')}
        className={`flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-pointer ${
          isCreateActive ? 'scale-110' : 'hover:scale-105'
        }`}
        title="Create - Image to Prompt & Text to Image"
        id="bottom-nav-create-tool"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            isCreateActive
              ? 'bg-[#E60023] text-white shadow-red-500/40 ring-2 ring-red-400'
              : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-[#E60023]'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className={`text-[10px] mt-0.5 font-black ${isCreateActive ? 'text-[#E60023]' : 'text-neutral-600 dark:text-neutral-400'}`}>
          Create
        </span>
      </a>

      {/* 4. Notifications Tab (Instant local cache switch) */}
      <a
        href="/notifications"
        onClick={(e) => handleNav(e, 'notifications', '/notifications')}
        id="bottom-nav-notifications"
        className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer ${
          isNotifsActive
            ? 'text-[#E60023] scale-105 font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="Notifications & Trending Drops"
      >
        <div className="relative">
          <Bell className={`w-6 h-6 ${isNotifsActive ? 'fill-current' : ''}`} />
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E60023] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-neutral-950 animate-pulse">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-medium">Updates</span>
      </a>

      {/* 5. Account / Profile Button (Instant local cache switch) */}
      <a
        href="/dashboard"
        onClick={(e) => handleNav(e, 'user-dashboard', '/dashboard')}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer ${
          isDashboardActive
            ? 'text-[#E60023] font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="My Creative Dashboard"
        id="bottom-nav-account"
      >
        <User className={`w-6 h-6 ${isDashboardActive ? 'fill-current' : ''}`} />
        <span className="text-[10px] mt-0.5 font-medium">
          {userAccount?.isLoggedIn ? 'Dashboard' : 'Sign In'}
        </span>
      </a>
    </nav>
  );
};

