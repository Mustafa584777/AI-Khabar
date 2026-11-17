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
import { BottomNav } from '@/components/public/BottomNav';
import { PromptPost, Category, SiteSettings } from '@/types/prompt';
import { prepareViewportPromptCards } from '@/lib/viewport-cache';

const AdminLayout = dynamic(() => import('@/components/admin/AdminLayout').then((m) => m.AdminLayout), { ssr: false });

function MainApp() {
  const { currentView } = useApp();

  if (currentView === 'admin') {
    return <AdminLayout />;
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
      const runWarmup = () => prepareViewportPromptCards(initialPosts, 8);
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const idleId = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(runWarmup, { timeout: 300 });
        return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId);
      }
      const timer = setTimeout(runWarmup, 100);
      return () => clearTimeout(timer);
    }
  }, [initialPosts, setPosts]);

  return <MainApp />;
}
