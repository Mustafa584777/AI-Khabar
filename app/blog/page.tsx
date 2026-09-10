'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  HelpCircle,
  Home,
} from 'lucide-react';
import { BLOG_POSTS } from '@/lib/blog-data';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { AppProvider } from '@/context/AppContext';

function BlogArchiveContent() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    BLOG_POSTS.forEach((p) => set.add(p.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      if (selectedCategory !== 'all' && post.category !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          post.title.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [search, selectedCategory]);

  const featuredPost = BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-[#E60023] flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold">Blog & Guides</span>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E60023]/10 text-[#E60023] text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>AI Photography & Prompting Guides</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Learn How to Craft & Use AI Prompts Like a Pro
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            Step-by-step masterclasses, camera optics breakdowns, model comparisons, and troubleshooting tips by <strong className="text-neutral-900 dark:text-white">tool.reelz</strong>.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#E60023] text-white shadow-sm shadow-[#E60023]/30'
                    : 'bg-[#efefef] dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700'
                }`}
              >
                {cat === 'all' ? 'All Guides' : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides & tutorials..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-[#efefef] dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]/40"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Featured Guide Banner (if no active search) */}
        {!search && selectedCategory === 'all' && featuredPost && (
          <div className="mb-12">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group relative grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 hover:border-[#E60023]/40 shadow-sm hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="lg:col-span-6 relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                <Image
                  src={featuredPost.coverImage}
                  alt={featuredPost.imageAlt || featuredPost.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 px-3.5 py-1 rounded-full bg-[#E60023] text-white text-xs font-bold flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Featured Master Guide</span>
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="font-semibold text-[#E60023]">
                      {featuredPost.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{featuredPost.readTime}</span>
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white group-hover:text-[#E60023] transition-colors leading-tight">
                    {featuredPost.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-7 h-7 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <Image
                        src="/logo.png"
                        alt={featuredPost.author.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {featuredPost.author.name}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E60023] group-hover:translate-x-1 transition-transform">
                    <span>Read Complete Guide</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group bg-white dark:bg-neutral-900 rounded-[24px] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                  <Image
                    src={post.coverImage}
                    alt={post.imageAlt || post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white">
                    {post.category}
                  </span>
                </Link>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{post.readTime}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-neutral-900 dark:text-white group-hover:text-[#E60023] transition-colors leading-snug line-clamp-2">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative w-6 h-6 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    <Image
                      src="/logo.webp"
                      alt={post.author.name}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    {post.author.name}
                  </span>
                </div>

                <Link
                  href={`/blog/${post.slug}`}
                  className="text-xs font-bold text-[#E60023] hover:underline flex items-center gap-1"
                >
                  <span>Read</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>

      <AdminLoginModal />
      <Footer />
    </div>
  );
}

export default function BlogArchivePage() {
  return (
    <AppProvider>
      <BlogArchiveContent />
    </AppProvider>
  );
}
