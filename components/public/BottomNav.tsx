'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Home, Search, Plus, User, Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationService } from '@/lib/notifications';

interface BottomNavProps {
  onSearchClick?: () => void;
}

export const BottomNav = ({ onSearchClick }: BottomNavProps) => {
  const pathname = usePathname();
  const router = useRouter();
  
  const {
    setSelectedSort,
    setSearchQuery,
    userAccount,
    setIsSearchModalOpen,
    setIsBookmarksDrawerOpen,
    setIsNotificationsModalOpen,
    setSelectedPost,
  } = useApp();

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const updateUnread = () => {
      const list = NotificationService.getNotifications();
      setUnreadNotifs(list.filter((n) => !n.read).length);
    };
    updateUnread();
    const interval = setInterval(updateUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHomeActive = pathname === '/';
  const isCreateActive = pathname === '/create';
  const isNotifsActive = pathname === '/notifications';
  const isDashboardActive = pathname === '/dashboard';

  const closeAllOverlays = () => {
    setSelectedPost(null);
    setIsBookmarksDrawerOpen(false);
    setIsSearchModalOpen(false);
    setIsNotificationsModalOpen(false);
  };

  const warmRoute = (path: string) => {
    try {
      router.prefetch(path);
    } catch {}
  };

  const handleNav = (
    e: React.MouseEvent,
    _targetView: 'public' | 'studio-tool' | 'notifications' | 'user-dashboard',
    targetPath: string
  ) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    closeAllOverlays();

    if (pathname === targetPath) {
      if (targetPath === '/') {
        setSelectedSort('random');
        setSearchQuery('');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    router.push(targetPath);
  };

  const handleSearchClick = () => {
    setIsBookmarksDrawerOpen(false);
    setIsNotificationsModalOpen(false);
    if (onSearchClick) {
      onSearchClick();
    } else {
      setIsSearchModalOpen(true);
    }
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/98 dark:bg-neutral-950/98 border-t border-neutral-200/70 dark:border-neutral-800/70 py-1.5 px-4 flex sm:hidden items-center justify-around shadow-xl"
    >
      {/* 1. Home Button */}
      <a
        href="/"
        onTouchStart={() => warmRoute('/')}
        onMouseEnter={() => warmRoute('/')}
        onClick={(e) => handleNav(e, 'public', '/')}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
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
        onTouchStart={() => { void import('./SearchExploreModal'); }}
        onMouseEnter={() => { void import('./SearchExploreModal'); }}
        onClick={handleSearchClick}
        className="flex flex-col items-center justify-center p-2 rounded-2xl text-neutral-500 hover:text-[#E60023] dark:hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
        title="Explore Categories"
        id="bottom-nav-explore"
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] mt-0.5 font-medium">Explore</span>
      </button>

      {/* 3. Create (+) Button */}
      <a
        href="/create"
        onTouchStart={() => warmRoute('/create')}
        onMouseEnter={() => warmRoute('/create')}
        onClick={(e) => handleNav(e, 'studio-tool', '/create')}
        className={`flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
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

      {/* 4. Notifications Tab */}
      <a
        href="/notifications"
        onTouchStart={() => warmRoute('/notifications')}
        onMouseEnter={() => warmRoute('/notifications')}
        onClick={(e) => handleNav(e, 'notifications', '/notifications')}
        id="bottom-nav-notifications"
        className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
          isNotifsActive
            ? 'text-[#E60023] scale-105 font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="Notifications & Trending Drops"
      >
        <div className="relative">
          <Bell className={`w-6 h-6 ${isNotifsActive ? 'fill-current' : ''}`} />
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E60023] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-neutral-950">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-medium">Updates</span>
      </a>

      {/* 5. Account / Profile Button */}
      <a
        href="/dashboard"
        onTouchStart={() => warmRoute('/dashboard')}
        onMouseEnter={() => warmRoute('/dashboard')}
        onClick={(e) => handleNav(e, 'user-dashboard', '/dashboard')}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
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

