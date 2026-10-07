'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { HeroSection } from '@/components/public/HeroSection';
import { ToolFilterBar } from '@/components/public/ToolFilterBar';
import { PromptGrid } from '@/components/public/PromptGrid';
import { Footer } from '@/components/public/Footer';
import { SEOContentSection } from '@/components/public/SEOContentSection';
import { BottomNav } from '@/components/public/BottomNav';
import { slugify } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { PromptPost } from '@/types/prompt';

const PromptDetailModal = dynamic(() => import('@/components/public/PromptDetailModal').then((m) => m.PromptDetailModal), { ssr: false });
const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const UserDashboard = dynamic(() => import('@/components/public/UserDashboard').then((m) => m.UserDashboard), { ssr: false });
const AIStudioTool = dynamic(() => import('@/components/public/AIStudioTool').then((m) => m.AIStudioTool), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const AdminLayout = dynamic(() => import('@/components/admin/AdminLayout').then((m) => m.AdminLayout), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });
const SearchExploreModal = dynamic(() => import('@/components/public/SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const RazorpayCheckoutModal = dynamic(() => import('@/components/public/RazorpayCheckoutModal').then((m) => m.RazorpayCheckoutModal), { ssr: false });
const UnlockPremiumModal = dynamic(() => import('@/components/public/UnlockPremiumModal').then((m) => m.UnlockPremiumModal), { ssr: false });
const ToastNotification = dynamic(() => import('@/components/public/ToastNotification').then((m) => m.ToastNotification), { ssr: false });

function GlobalDirectModals() {
  const {
    selectedPost,
    isBookmarksDrawerOpen,
    isTasteModalOpen,
    isUserAuthModalOpen,
    showLoginModal,
    isSearchModalOpen,
    isProCheckoutModalOpen,
    isUnlockPremiumModalOpen,
    toastMessage,
  } = useApp();

  return (
    <>
      {isSearchModalOpen && <SearchExploreModal />}
      {selectedPost && <PromptDetailModal />}
      {isBookmarksDrawerOpen && <BookmarksDrawer />}
      {isTasteModalOpen && <TasteProfileModal />}
      {isUserAuthModalOpen && <UserAuthModal />}
      {showLoginModal && <AdminLoginModal />}
      {toastMessage && <ToastNotification />}
      {isProCheckoutModalOpen && <RazorpayCheckoutModal />}
      {isUnlockPremiumModalOpen && <UnlockPremiumModal />}
    </>
  );
}

export function DirectPromptLoader({
  id,
  initialPost,
}: {
  id: string;
  initialPost?: PromptPost | null;
}) {
  const { posts, setSelectedPost, currentView, showLoginModal, toastMessage } = useApp();
  const loadedPostIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedPostIdRef.current === id) return;

    if (initialPost) {
      loadedPostIdRef.current = id;
      setSelectedPost(initialPost);
      return;
    }

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
          if (data && data.post) {
            loadedPostIdRef.current = id;
            setSelectedPost(data.post);
          }
        })
        .catch(() => {});
    }
  }, [id, initialPost, posts, setSelectedPost]);

  if (currentView === 'admin') {
    return (
      <>
        <AdminLayout />
        {showLoginModal && <AdminLoginModal />}
        {toastMessage && <ToastNotification />}
      </>
    );
  }

  if (currentView === 'user-dashboard') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
        <UserDashboard />
        <BottomNav />
        <GlobalDirectModals />
      </div>
    );
  }

  if (currentView === 'for-you') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E60023]" />
              <span>For You (Personalized Feed)</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Curated visual prompt cards tailored strictly to your creative taste profile, bookmark history, and aesthetic preferences.
            </p>
          </div>
          <PromptGrid />
        </div>
        <BottomNav />
        <GlobalDirectModals />
      </div>
    );
  }

  if (currentView === 'studio-tool') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
        <Header />
        <AIStudioTool />
        <BottomNav />
        <GlobalDirectModals />
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
      <GlobalDirectModals />
    </div>
  );
}
