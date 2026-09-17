'use client';

import React, { use, useEffect, useRef } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { HeroSection } from '@/components/public/HeroSection';
import { ToolFilterBar } from '@/components/public/ToolFilterBar';
import { PromptGrid } from '@/components/public/PromptGrid';
import { PromptDetailModal } from '@/components/public/PromptDetailModal';
import { BookmarksDrawer } from '@/components/public/BookmarksDrawer';
import { Footer } from '@/components/public/Footer';
import { SEOContentSection } from '@/components/public/SEOContentSection';
import { ToastNotification } from '@/components/public/ToastNotification';
import { BottomNav } from '@/components/public/BottomNav';
import { TasteProfileModal } from '@/components/public/TasteProfileModal';
import { UserDashboard } from '@/components/public/UserDashboard';
import { AIStudioTool } from '@/components/public/AIStudioTool';
import { UserAuthModal } from '@/components/public/UserAuthModal';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { SearchExploreModal } from '@/components/public/SearchExploreModal';
import { slugify } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

function DirectPromptLoader({ id }: { id: string }) {
  const { posts, setSelectedPost, currentView } = useApp();
  const loadedPostIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only attempt loading once for a given URL id param
    if (loadedPostIdRef.current === id) return;

    const targetSlug = decodeURIComponent(id).toLowerCase().trim();
    const matched = posts.find((p) => {
      if (p.slug && (p.slug.toLowerCase() === targetSlug || slugify(p.slug) === targetSlug)) return true;
      if (p.id && p.id.toLowerCase() === targetSlug) return true;
      if (p.title && (p.title.toLowerCase() === targetSlug || slugify(p.title) === targetSlug)) return true;
      return false;
    });

    if (matched) {
      loadedPostIdRef.current = id;
      setSelectedPost(matched);
    } else {
      fetch(`/api/posts/${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          if (data.success && data.post) {
            loadedPostIdRef.current = id;
            setSelectedPost(data.post);
          }
        })
        .catch(() => {});
    }
  }, [id, posts, setSelectedPost]);

  if (currentView === 'admin') {
    return (
      <>
        <AdminLayout />
        <AdminLoginModal />
        <ToastNotification />
      </>
    );
  }

  if (currentView === 'for-you') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
        <Header />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 p-6 rounded-3xl border border-red-200/50 dark:border-red-900/40">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#E60023]" />
              <span>Personalized For You Feed</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Curated visual prompt cards tailored strictly to your creative taste profile, bookmark history, and aesthetic preferences.
            </p>
          </div>
          <PromptGrid />
        </div>
        <BottomNav />
        <SearchExploreModal />
        <PromptDetailModal />
        <BookmarksDrawer />
        <TasteProfileModal />
        <UserAuthModal />
        <AdminLoginModal />
        <ToastNotification />
      </div>
    );
  }

  if (currentView === 'user-dashboard') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
        <UserDashboard />
        <PromptDetailModal />
        <BookmarksDrawer />
        <SearchExploreModal />
        <TasteProfileModal />
        <UserAuthModal />
        <AdminLoginModal />
        <ToastNotification />
        <BottomNav />
      </div>
    );
  }

  if (currentView === 'studio-tool') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
        <Header />
        <AIStudioTool />
        <PromptDetailModal />
        <BookmarksDrawer />
        <SearchExploreModal />
        <TasteProfileModal />
        <UserAuthModal />
        <AdminLoginModal />
        <ToastNotification />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />
      <HeroSection />
      <ToolFilterBar />
      <PromptGrid />
      <SEOContentSection />
      <Footer />
      <BottomNav />
      <SearchExploreModal />
      <PromptDetailModal />
      <BookmarksDrawer />
      <TasteProfileModal />
      <UserAuthModal />
      <AdminLoginModal />
      <ToastNotification />
    </div>
  );
}

export default function SinglePromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <AppProvider>
      <DirectPromptLoader id={resolvedParams.id} />
    </AppProvider>
  );
}
