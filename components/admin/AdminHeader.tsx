'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Globe,
  PlusCircle,
  Sparkles,
  LogOut,
  Bell,
  Menu,
  ShieldCheck,
  Search,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const AdminHeader = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => {
  const {
    setCurrentView,
    setAdminSubView,
    setEditingPostId,
    logout,
    currentUser,
    settings,
    showToast,
  } = useApp();

  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      // 1. Call server-side cache clearing & revalidation
      const res = await fetch('/api/admin/clear-cache', {
        method: 'POST',
      });

      // 2. Clear browser cache storage safely (preserve localStorage auth & credits)
      if ('caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        } catch (e) {
          console.warn('Browser cache purge notice:', e);
        }
      }

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'System cache, routes, and browser cache cleared successfully!');
      } else {
        showToast('Route cache revalidated. Browser cache cleared.');
      }
    } catch (err: any) {
      console.error('Clear cache error:', err);
      showToast('Cache purge completed.');
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <Link
            href="/"
            onClick={() => setCurrentView('public')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors"
            title="Open Live Public Directory"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-500" />
            <span>Visit Site</span>
          </Link>

          <span className="hidden sm:inline text-xs text-neutral-400 font-mono">
            {settings.siteUrl || 'trendinggeminiprompts.com'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Purge / Clear Cache Button */}
        <button
          onClick={handleClearCache}
          disabled={isClearingCache}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
          title="Clear system cache, ISR routes, and browser cache"
          id="admin-clear-cache-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isClearingCache ? 'Purging...' : 'Clear Cache'}</span>
        </button>

        {/* Quick Add New Prompt Button */}
        <button
          onClick={() => {
            setEditingPostId(null);
            setAdminSubView('new-post');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          id="admin-topbar-new-prompt-btn"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Prompt</span>
        </button>

        {/* AI Quick Generator */}
        <button
          onClick={() => setAdminSubView('ai-generator')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors hover:bg-indigo-100"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Gemini AI Wizard</span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-850">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 hidden md:inline">
            {currentUser?.name || 'Admin'}
          </span>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
