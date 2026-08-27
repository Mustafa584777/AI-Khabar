'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Check,
  Sparkles,
  Home,
  Tag,
  Bookmark,
  BookOpen,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { getBlogPostBySlug, getAllBlogPosts } from '@/lib/blog-data';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { AppProvider, useApp } from '@/context/AppContext';

function SingleBlogPostContent({ slug }: { slug: string }) {
  const post = getBlogPostBySlug(slug);
  const [copiedLink, setCopiedLink] = useState(false);
  const { showToast } = useApp();

  if (!post) {
    return notFound();
  }

  const allPosts = getAllBlogPosts();
  const relatedPosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      showToast('Article URL copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-8">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-blue-600">
            Blog & Guides
          </Link>
          <span>/</span>
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold truncate max-w-xs sm:max-w-md">
            {post.title}
          </span>
        </div>

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Guides & Blog</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
              {post.category}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Author and Metadata Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                <Image
                  src="/logo.png"
                  alt={post.author.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="font-bold text-neutral-900 dark:text-white text-sm">
                  {post.author.name}
                </div>
                <div className="text-[11px] text-neutral-500">{post.author.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>

              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readTime}</span>
              </span>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold transition-colors"
                title="Share article URL"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        {post.coverImage && (
          <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden mb-10 shadow-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-950">
            <Image
              src={post.coverImage}
              alt={post.imageAlt || post.title}
              fill
              priority
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Article Body Content */}
        <article className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-10 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="prose dark:prose-invert max-w-none text-neutral-800 dark:text-neutral-200 text-sm sm:text-base leading-relaxed">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-neutral-400" />
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Interactive CTA Banner: Explore Live Prompts */}
        <div className="mt-10 p-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-extrabold">Ready to try trending prompts?</h3>
            <p className="text-xs sm:text-sm text-blue-100">
              Browse our live directory with 1-click copy for Midjourney, Flux, ChatGPT and Bing.
            </p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl bg-white text-blue-700 hover:bg-neutral-100 font-bold text-xs shadow-lg transition-all shrink-0 flex items-center gap-2"
          >
            <span>Explore All Prompts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related Guides */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 space-y-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>More AI Photography Guides</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.slug}`}
                  className="group flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 overflow-hidden shadow-sm hover:shadow-md transition-all p-4"
                >
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-neutral-950 mb-3">
                    <Image
                      src={rp.coverImage}
                      alt={rp.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                    {rp.title}
                  </h4>
                  <span className="text-[11px] text-neutral-500 font-medium">{rp.readTime}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <AdminLoginModal />
      <Footer />
    </div>
  );
}

export default function SingleBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  return (
    <AppProvider>
      <SingleBlogPostContent slug={resolvedParams.slug} />
    </AppProvider>
  );
}
