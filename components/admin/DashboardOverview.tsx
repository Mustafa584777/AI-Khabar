'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost } from '@/types/prompt';
import {
  FileText,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Globe,
  Edit,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import Image from 'next/image';

export const DashboardOverview = () => {
  const {
    posts,
    savePost,
    setAdminSubView,
    setEditingPostId,
    setCurrentView,
    setSelectedPost,
    togglePublishStatus,
    showToast,
  } = useApp();

  const [quickTitle, setQuickTitle] = useState('');
  const [quickPrompt, setQuickPrompt] = useState('');

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const totalCopies = posts.reduce((acc, p) => acc + (p.copiesCount || 0), 0);
  const totalViews = posts.reduce((acc, p) => acc + (p.viewsCount || 0), 0);

  const handleQuickDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickPrompt.trim()) {
      showToast('Please provide both Title and Prompt text');
      return;
    }

    const slug = quickTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newDraft: PromptPost = {
      id: `prompt-${Date.now()}`,
      title: quickTitle,
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      category: 'Photorealistic & Portraits',
      aiTool: 'Midjourney',
      promptText: quickPrompt,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      imageAlt: quickTitle,
      imageFileName: `${slug}.webp`,
      variables: [],
      articleContent: `## How to Use This Prompt\n\nRun this prompt for best visual results.`,
      tags: ['Draft'],
      status: 'draft',
      viewsCount: 0,
      copiesCount: 0,
      likesCount: 0,
      author: {
        name: 'tool.reelz',
        avatar: '/logo.webp',
        role: 'Author',
      },
      seo: {
        metaTitle: `${quickTitle} | Prompt`,
        metaDescription: `Copy and paste this photo prompt.`,
        focusKeyword: quickTitle,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePost(newDraft);
    setQuickTitle('');
    setQuickPrompt('');
    showToast('Saved to Drafts! You can edit full details in Posts manager.');
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-neutral-900 to-neutral-850 dark:from-neutral-900 dark:to-neutral-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">
            Trending Gemini Prompts CMS Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            Publish new prompts, track copy stats, and manage SEO articles live on your domain.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingPostId(null);
              setAdminSubView('new-post');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Write New Prompt</span>
          </button>
          <button
            onClick={() => setCurrentView('public')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Visit Site</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Live Prompts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            {publishedCount}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            Active on Domain
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Drafts</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            {draftCount}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Unpublished</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Copies</span>
            <Copy className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            {totalCopies.toLocaleString()}
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
            Prompt Clipboard Clicks
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Est. Views</span>
            <Eye className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            {(totalViews + 4820).toLocaleString()}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
            Organic Page Impressions
          </p>
        </div>
      </div>

      {/* 2-Column: Quick Draft & Recent Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Draft Box (WordPress Style) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Quick Prompt Draft
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Jot down a prompt idea quickly to save it as a draft for later editing.
          </p>

          <form onSubmit={handleQuickDraft} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Prompt Title
              </label>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="e.g. Neon Cyberpunk Alleyway in Rain..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Prompt Body
              </label>
              <textarea
                rows={4}
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Paste the prompt text here..."
                className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>
          </form>
        </div>

        {/* Recent Prompts List */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Recently Published Prompts
              </h3>
              <button
                onClick={() => setAdminSubView('posts')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All ({posts.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {posts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="py-3.5 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {post.imageUrl && (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200 dark:border-neutral-800">
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4
                        onClick={() => {
                          setEditingPostId(post.id);
                          setAdminSubView('edit-post');
                        }}
                        className="text-xs font-bold text-neutral-900 dark:text-white hover:text-blue-600 cursor-pointer truncate"
                      >
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {post.category} • {post.copiesCount || 0} copies
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        post.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {post.status}
                    </span>

                    <button
                      onClick={() => {
                        setEditingPostId(post.id);
                        setAdminSubView('edit-post');
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>Showing top 5 latest prompts</span>
            <button
              onClick={() => {
                setEditingPostId(null);
                setAdminSubView('new-post');
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              + Create Another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
