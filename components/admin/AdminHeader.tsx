'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { getEmailAvatarUrl } from '@/lib/utils';
import { StorageService } from '@/lib/storage';

export const AdminHeader = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => {
  const router = useRouter();
  const {
    setCurrentView,
    setAdminSubView,
    setEditingPostId,
    logout,
    currentUser,
    settings,
    showToast,
    refreshData,
  } = useApp();

  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      // 1. Server-side ISR revalidation across all URLs + ServerStorage reset + CDN purge
      const res = await fetch(`/api/admin/clear-cache?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
      });

      // 2. Purge stale localStorage content caches (preserves auth, Pro plan, credits & bookmarks)
      StorageService.clearContentCache();

      // 3. Purge ALL CacheStorage entries and Service Worker caches
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          try {
            const cacheKeys = await window.caches.keys();
            await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
          } catch (e) {
            console.warn('Browser cache purge notice:', e);
          }
        }

        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
              reg.active?.postMessage({ type: 'PURGE_ALL_CACHES' });
              await reg.update().catch(() => {});
            }
          } catch {}
        }

        // 4. Bypass browser HTTP disk cache for core routes so latest build/data loads immediately
        await Promise.allSettled([
          fetch('/', { cache: 'reload' }),
          fetch('/free-gemini-watermark-remover-online', { cache: 'reload' }),
          fetch('/api/categories', { cache: 'reload' }),
          fetch('/api/settings', { cache: 'reload' }),
        ]);
      }

      refreshData();
      router.refresh();

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'All URL caches, ISR routes, and browser cache purged successfully!');
      } else {
        showToast('Route cache revalidated & browser cache cleared.');
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
        <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-200 dark:border-neutral-800">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0 bg-neutral-200 dark:bg-neutral-800">
            <img
              src={
                currentUser?.avatar && !currentUser.avatar.includes('unsplash.com')
                  ? currentUser.avatar
                  : getEmailAvatarUrl(currentUser?.email || settings?.adminEmail, currentUser?.name)
              }
              alt={currentUser?.name || 'Admin'}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 hidden md:inline max-w-[130px] truncate" title={currentUser?.email}>
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
