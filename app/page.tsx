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
import { Sparkles } from 'lucide-react';

const PromptDetailModal = dynamic(() => import('@/components/public/PromptDetailModal').then((m) => m.PromptDetailModal), { ssr: false });
const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const UserDashboard = dynamic(() => import('@/components/public/UserDashboard').then((m) => m.UserDashboard), { ssr: false });
const AIStudioTool = dynamic(() => import('@/components/public/AIStudioTool').then((m) => m.AIStudioTool), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const AdminLayout = dynamic(() => import('@/components/admin/AdminLayout').then((m) => m.AdminLayout), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });
const SearchExploreModal = dynamic(() => import('@/components/public/SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const RequestedPromptsFeed = dynamic(() => import('@/components/public/RequestedPromptsFeed').then((m) => m.RequestedPromptsFeed), { ssr: false });

function MainApp() {
  const { currentView } = useApp();

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
        <RequestedPromptsFeed />
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

      {/* Pinterest Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Modals & Overlays */}
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

export default function Page() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
