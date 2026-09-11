'use client';

import React, { Suspense } from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { NotificationsView } from '@/components/public/NotificationsView';
import { ToastNotification } from '@/components/public/ToastNotification';
import { BookmarksDrawer } from '@/components/public/BookmarksDrawer';
import { UserAuthModal } from '@/components/public/UserAuthModal';
import { SearchExploreModal } from '@/components/public/SearchExploreModal';
import { PromptDetailModal } from '@/components/public/PromptDetailModal';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-500">Loading notifications...</div>}>
        <NotificationsView />
      </Suspense>
      <Footer />
      <BottomNav />
      <BookmarksDrawer />
      <UserAuthModal />
      <SearchExploreModal />
      <PromptDetailModal />
      <ToastNotification />
    </div>
  );
}
