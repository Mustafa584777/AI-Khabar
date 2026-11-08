'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { HeroSection } from '@/components/public/HeroSection';
import { ToolFilterBar } from '@/components/public/ToolFilterBar';
import { PromptGrid } from '@/components/public/PromptGrid';
import { Footer } from '@/components/public/Footer';
import { SEOContentSection } from '@/components/public/SEOContentSection';
import { ToastNotification } from '@/components/public/ToastNotification';
import { BottomNav } from '@/components/public/BottomNav';
import { PromptPost, Category, SiteSettings } from '@/types/prompt';
import { PromptDetailModal } from '@/components/public/PromptDetailModal';

const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const AdminLayout = dynamic(() => import('@/components/admin/AdminLayout').then((m) => m.AdminLayout), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });
const SearchExploreModal = dynamic(() => import('@/components/public/SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const RazorpayCheckoutModal = dynamic(() => import('@/components/public/RazorpayCheckoutModal').then((m) => m.RazorpayCheckoutModal), { ssr: false });
const UnlockPremiumModal = dynamic(() => import('@/components/public/UnlockPremiumModal').then((m) => m.UnlockPremiumModal), { ssr: false });

function GlobalInteractiveModals() {
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
      {selectedPost && <PromptDetailModal />}
      {isSearchModalOpen && <SearchExploreModal />}
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

function MainApp() {
  const { currentView, showLoginModal, toastMessage } = useApp();

  if (currentView === 'admin') {
    return (
      <>
        <AdminLayout />
        {showLoginModal && <AdminLoginModal />}
        {toastMessage && <ToastNotification />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      {/* Public Home Feed */}
      <main id="view-public-home" className="flex-1">
        <HeroSection />
        <ToolFilterBar />
        <PromptGrid />
        <SEOContentSection />
      </main>

      <Footer />
      <BottomNav />
      <GlobalInteractiveModals />
    </div>
  );
}

interface HomeClientWrapperProps {
  initialPosts?: PromptPost[];
  initialCategories?: Category[];
  initialSettings?: SiteSettings;
}

export function HomeClientWrapper({ initialPosts }: HomeClientWrapperProps) {
  const { setPosts } = useApp();

  React.useEffect(() => {
    if (initialPosts && initialPosts.length > 0) {
      setPosts((prev) => (prev && prev.length >= initialPosts.length ? prev : initialPosts));
    }
  }, [initialPosts, setPosts]);

  return <MainApp />;
}
