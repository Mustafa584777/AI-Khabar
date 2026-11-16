'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { PromptGrid } from '@/components/public/PromptGrid';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { PromptDetailModal } from '@/components/public/PromptDetailModal';
import { slugify } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { PromptPost } from '@/types/prompt';

const UserDashboard = dynamic(() => import('@/components/public/UserDashboard').then((m) => m.UserDashboard), { ssr: false });
const AIStudioTool = dynamic(() => import('@/components/public/AIStudioTool').then((m) => m.AIStudioTool), { ssr: false });
const AdminLayout = dynamic(() => import('@/components/admin/AdminLayout').then((m) => m.AdminLayout), { ssr: false });

const PROMPT_DETAIL_CACHE_KEY = 'auraprompt_prompt_detail_cache_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function readCachedPrompt(idOrSlug: string): PromptPost | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROMPT_DETAIL_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { post: PromptPost; savedAt: number }>;
    const key = decodeURIComponent(idOrSlug).toLowerCase().trim();
    const entry = map[key];
    if (!entry || !entry.post) return null;
    if (Date.now() - entry.savedAt > SEVEN_DAYS_MS) return null;
    return entry.post;
  } catch {
    return null;
  }
}

function writeCachedPrompt(idOrSlug: string, post: PromptPost) {
  if (typeof window === 'undefined' || !post) return;
  try {
    const raw = localStorage.getItem(PROMPT_DETAIL_CACHE_KEY);
    const map: Record<string, { post: PromptPost; savedAt: number }> = raw ? JSON.parse(raw) : {};
    const key = decodeURIComponent(idOrSlug).toLowerCase().trim();
    map[key] = { post, savedAt: Date.now() };
    const entries = Object.entries(map);
    if (entries.length > 100) {
      entries.sort((a, b) => b[1].savedAt - a[1].savedAt);
      const trimmed = Object.fromEntries(entries.slice(0, 80));
      localStorage.setItem(PROMPT_DETAIL_CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(PROMPT_DETAIL_CACHE_KEY, JSON.stringify(map));
    }
  } catch {}
}

export function DirectPromptLoader({
  id,
  initialPost,
}: {
  id: string;
  initialPost?: PromptPost | null;
}) {
  const { posts, setSelectedPost, currentView, setIsDirectRouteHost, ensureFullCatalogLoaded } = useApp();
  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsDirectRouteHost(true);
    return () => {
      setIsDirectRouteHost(false);
    };
  }, [setIsDirectRouteHost]);

  useEffect(() => {
    // Only initialize ONCE per route id so closing or selecting recommended cards never snaps back to initialPost
    if (initializedIdRef.current === id) return;

    if (initialPost) {
      initializedIdRef.current = id;
      setSelectedPost(initialPost);
      writeCachedPrompt(id, initialPost);
      return;
    }

    if (!id) return;

    let targetSlug = id;
    try {
      targetSlug = decodeURIComponent(id).toLowerCase().trim();
    } catch {
      targetSlug = id.toLowerCase().trim();
    }

    const findMatch = (list: PromptPost[]) =>
      list.find((p) => {
        if (p.slug && (p.slug.toLowerCase() === targetSlug || slugify(p.slug) === targetSlug)) return true;
        if (p.id && p.id.toLowerCase() === targetSlug) return true;
        if (p.title && (p.title.toLowerCase() === targetSlug || slugify(p.title) === targetSlug)) return true;
        return false;
      });

    const matched = findMatch(posts);
    if (matched) {
      initializedIdRef.current = id;
      setSelectedPost(matched);
      writeCachedPrompt(id, matched);
      return;
    }

    const cached = readCachedPrompt(id);
    if (cached) {
      initializedIdRef.current = id;
      setSelectedPost(cached);
      return;
    }

    let cancelled = false;
    ensureFullCatalogLoaded().then((allPosts) => {
      if (cancelled || initializedIdRef.current === id) return;
      const deepMatch = findMatch(allPosts);
      if (deepMatch) {
        initializedIdRef.current = id;
        setSelectedPost(deepMatch);
        writeCachedPrompt(id, deepMatch);
        return;
      }

      fetch(`/api/posts/${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          if (!cancelled && data && data.post && initializedIdRef.current !== id) {
            initializedIdRef.current = id;
            setSelectedPost(data.post);
            writeCachedPrompt(id, data.post);
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [id, initialPost, posts, setSelectedPost, ensureFullCatalogLoaded]);

  if (currentView === 'admin') {
    return <AdminLayout />;
  }

  if (currentView === 'user-dashboard') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
        <UserDashboard />
        <BottomNav />
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
      </div>
    );
  }

  if (currentView === 'studio-tool') {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col">
        <Header />
        <AIStudioTool />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col pb-20 sm:pb-8">
      <Header />
      <main className="flex-1 w-full">
        <PromptDetailModal inlinePost={initialPost} isDirectRoute />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
