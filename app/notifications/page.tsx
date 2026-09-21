'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { NotificationsView } from '@/components/public/NotificationsView';
import { ToastNotification } from '@/components/public/ToastNotification';

const PromptDetailModal = dynamic(() => import('@/components/public/PromptDetailModal').then((m) => m.PromptDetailModal), { ssr: false });
const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const SearchExploreModal = dynamic(() => import('@/components/public/SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });
const RazorpayCheckoutModal = dynamic(() => import('@/components/public/RazorpayCheckoutModal').then((m) => m.RazorpayCheckoutModal), { ssr: false });
const UnlockPremiumModal = dynamic(() => import('@/components/public/UnlockPremiumModal').then((m) => m.UnlockPremiumModal), { ssr: false });

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <NotificationsView />
      </main>
      <Footer />
      <BottomNav />

      {/* Global Modals & Overlays */}
      <SearchExploreModal />
      <PromptDetailModal />
      <BookmarksDrawer />
      <TasteProfileModal />
      <UserAuthModal />
      <AdminLoginModal />
      <ToastNotification />
      <RazorpayCheckoutModal />
      <UnlockPremiumModal />
    </div>
  );
}
