'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { HeroSection } from '@/components/public/HeroSection';
import { ToolFilterBar } from '@/components/public/ToolFilterBar';
import { PromptGrid } from '@/components/public/PromptGrid';
import { Footer } from '@/components/public/Footer';
import { SEOContentSection } from '@/components/public/SEOContentSection';
import { ToastNotification } from '@/components/public/ToastNotification';
import { BottomNav } from '@/components/public/BottomNav';
import { PromptPost, Category, SiteSettings } from '@/types/prompt';

import { DashboardSkeleton } from '@/components/public/DashboardSkeleton';

import { PromptDetailModal } from '@/components/public/PromptDetailModal';
const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const UserDashboard = dynamic(() => import('@/components/public/UserDashboard').then((m) => m.UserDashboard), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});
const AIStudioTool = dynamic(() => import('@/components/public/AIStudioTool').then((m) => m.AIStudioTool), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const NotificationsView = dynamic(() => import('@/components/public/NotificationsView').then((m) => m.NotificationsView), { ssr: false });
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

  // KeepAlive Cache: keep views in memory once opened so navigating back is 0ms without re-fetching
  const [cachedViews, setCachedViews] = React.useState<Set<string>>(() => new Set(['public']));

  React.useEffect(() => {
    if (currentView) {
      setCachedViews((prev) => {
        if (prev.has(currentView)) return prev;
        const next = new Set(prev);
        next.add(currentView);
        return next;
      });
    }
  }, [currentView]);

  if (currentView === 'admin') {
    return (
      <>
        <AdminLayout />
        {showLoginModal && <AdminLoginModal />}
        {toastMessage && <ToastNotification />}
      </>
    );
  }

  const isHomeActive = currentView === 'public' || currentView === 'for-you';
  const isDashboardActive = currentView === 'user-dashboard';
  const isStudioActive = currentView === 'studio-tool';
  const isNotifsActive = currentView === 'notifications';

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      {/* 1. Public Home Feed (Always kept alive & in memory) */}
      <main
        id="view-public-home"
        style={{ display: isHomeActive ? 'block' : 'none' }}
      >
        <HeroSection />
        <ToolFilterBar />
        <PromptGrid />
        <SEOContentSection />
        <Footer />
      </main>

      {/* 2. User Dashboard (Always mounted for instant 0ms cached opening) */}
      <div
        id="view-user-dashboard"
        style={{ display: isDashboardActive ? 'block' : 'none' }}
        className="flex-1"
      >
        <UserDashboard />
      </div>

      {/* 3. AI Studio Tool / Create (Always mounted for instant 0ms cached opening) */}
      <div
        id="view-studio-tool"
        style={{ display: isStudioActive ? 'block' : 'none' }}
        className="flex-1"
      >
        <AIStudioTool />
      </div>

      {/* 4. Notifications / Updates View (Always mounted for instant 0ms cached opening) */}
      <div
        id="view-notifications"
        style={{ display: isNotifsActive ? 'block' : 'none' }}
        className="flex-1"
      >
        <NotificationsView />
      </div>

      <BottomNav />
      <GlobalInteractiveModals />
    </div>
  );
}

interface HomeClientWrapperProps {
  initialPosts: PromptPost[];
  initialCategories: Category[];
  initialSettings: SiteSettings;
}

export function HomeClientWrapper({ initialPosts, initialCategories, initialSettings }: HomeClientWrapperProps) {
  return (
    <AppProvider initialPosts={initialPosts} initialCategories={initialCategories} initialSettings={initialSettings}>
      <MainApp />
    </AppProvider>
  );
}
