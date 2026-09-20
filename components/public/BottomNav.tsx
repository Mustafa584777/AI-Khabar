'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, User, Bell, Sun, Moon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationService } from '@/lib/notifications';

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
    setIsNotificationsModalOpen,
    isNotificationsModalOpen,
    userAccount,
    openAuthModal,
    isDarkMode,
    toggleTheme,
  } = useApp();

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const updateUnread = () => {
      const list = NotificationService.getNotifications();
      setUnreadNotifs(list.filter((n) => !n.read).length);
    };
    updateUnread();
    const interval = setInterval(updateUnread, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      setIsSearchModalOpen(true);
    }
  };

  const handleNotificationsClick = () => {
    router.push('/notifications');
  };

  const handleAccountClick = () => {
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Sign in to access your Creator Dashboard and saved prompts.');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-200/70 dark:border-neutral-800/70 py-2 px-6 flex sm:hidden items-center justify-between shadow-2xl transition-all"
    >
      {/* 1. Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="flex flex-col items-center justify-center p-2 rounded-2xl text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] transition-all duration-200"
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        id="bottom-nav-theme-toggle"
      >
        {isDarkMode ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-neutral-700" />}
        <span className="text-[10px] mt-0.5 font-medium">{isDarkMode ? 'Light' : 'Dark'}</span>
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

      {/* 3. Notifications Tab */}
      <button
        onClick={handleNotificationsClick}
        id="bottom-nav-notifications"
        className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          pathname === '/notifications'
            ? 'text-[#E60023] scale-105 font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="Notifications & Trending Drops"
      >
        <div className="relative">
          <Bell className={`w-6 h-6 ${pathname === '/notifications' ? 'fill-current' : ''}`} />
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E60023] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-neutral-950 animate-pulse">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-medium">Updates</span>
      </button>

      {/* 4. Account / Profile Button */}
      <button
        onClick={handleAccountClick}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          pathname === '/dashboard'
            ? 'text-[#E60023] font-bold'
            : 'text-neutral-500 hover:text-[#E60023] dark:hover:text-white'
        }`}
        title="My Creative Dashboard"
        id="bottom-nav-account"
      >
        <User className={`w-6 h-6 ${pathname === '/dashboard' ? 'fill-current' : ''}`} />
        <span className="text-[10px] mt-0.5 font-medium">
          {userAccount?.isLoggedIn ? 'Dashboard' : 'Sign In'}
        </span>
      </button>
    </nav>
  );
};

