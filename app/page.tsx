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
    <MainApp />
  );
}
