'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { ToastNotification } from '@/components/public/ToastNotification';

const UserDashboard = dynamic(() => import('@/components/public/UserDashboard').then((m) => m.UserDashboard), { ssr: false });
const PromptDetailModal = dynamic(() => import('@/components/public/PromptDetailModal').then((m) => m.PromptDetailModal), { ssr: false });
const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const SearchExploreModal = dynamic(() => import('@/components/public/SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
      <Header />
      <div className="flex-1">
        <UserDashboard />
      </div>
      <Footer />
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
