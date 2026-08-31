'use client';

import React, { use, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Check,
  Bookmark,
  Sparkles,
  Share2,
  Heart,
  Calendar,
  Eye,
  Tag,
  Home,
  ChevronRight,
  Maximize2,
  Download,
  X,
  Loader2,
  Pin,
  SearchX,
} from 'lucide-react';
import { PromptPost } from '@/types/prompt';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { PromptCard } from '@/components/public/PromptCard';
import { BookmarksDrawer } from '@/components/public/BookmarksDrawer';
import { UserAuthModal } from '@/components/public/UserAuthModal';
import { TasteProfileModal } from '@/components/public/TasteProfileModal';
import { SearchExploreModal } from '@/components/public/SearchExploreModal';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { PersonalizationEngine } from '@/lib/personalization';
import { slugify, getPromptSlug } from '@/lib/utils';

function SinglePromptDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const {
    posts,
    copyPromptToClipboard,
    toggleBookmark,
    toggleLike,
    likedIds,
    bookmarkedIds,
    tasteProfile,
    showToast,
    setCurrentView,
  } = useApp();

  const targetSlug = useMemo(() => {
    try {
      return decodeURIComponent(id).toLowerCase().trim();
    } catch {
      return id.toLowerCase().trim();
    }
  }, [id]);

  const cachedInitialPost = useMemo(() => {
    return (
      posts.find((p) => {
        if (p.slug && (p.slug.toLowerCase() === targetSlug || slugify(p.slug) === targetSlug)) return true;
        if (p.id && p.id.toLowerCase() === targetSlug) return true;
        if (p.title && (p.title.toLowerCase() === targetSlug || slugify(p.title) === targetSlug)) return true;
        return false;
      }) || null
    );
  }, [posts, targetSlug]);

  const [post, setPost] = useState<PromptPost | null>(cachedInitialPost);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedInitialPost);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [displayedCount, setDisplayedCount] = useState<number>(15);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // 1. Resolve prompt from context cache or fetch directly from API
  useEffect(() => {
    let isMounted = true;

    if (!cachedInitialPost) {
      fetch(`/api/posts/${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          if (isMounted && data.success && data.post) {
            setPost(data.post);
          }
        })
        .catch((err) => {
          console.warn('Could not load prompt by id:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [id, cachedInitialPost]);

  // Track genuine view count (1 view per unique user session per prompt)
  useEffect(() => {
    if (post?.id) {
      const postId = post.id;
      const sessionKey = `auraprompt_viewed_${postId}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1');
        fetch(`/api/posts/${encodeURIComponent(postId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'view' }),
        }).catch(() => {});
      }
    }
  }, [post?.id]);

  const isLiked = post ? likedIds?.includes(post.id) : false;
  const isBookmarked = post ? bookmarkedIds?.includes(post.id) : false;

  const handleLike = () => {
    if (!post) return;
    toggleLike(post.id);
  };

  const handleBookmark = () => {
    if (!post) return;
    toggleBookmark(post.id);
  };

  const handleCopyMasterPrompt = () => {
    if (!post) return;
    copyPromptToClipboard(post.promptText, post.id);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleGenerateImage = () => {
    if (!post) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auraprompt_studio_preload', post.promptText);
    }
    setCurrentView('studio-tool');
    router.push('/');
    showToast('Loaded prompt into AI Studio Image Generator!');
  };

  const handleDownloadImage = async () => {
    if (!post?.imageUrl) return;

    setIsDownloadingImage(true);
    try {
      showToast('Downloading photo...');
      const response = await fetch(post.imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response error');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanSlug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      link.download = `${cleanSlug}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded successfully!');
    } catch {
      const link = document.createElement('a');
      link.href = post.imageUrl;
      link.target = '_blank';
      link.download = `${post.slug || 'ai-prompt-photo'}.jpg`;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Image downloaded!');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    const postSlug = getPromptSlug(post);
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/prompt/${postSlug}` : '';
    const shareData = {
      title: post.title,
      text: `Check out this AI photo prompt: ${post.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!');
      }
    }
  };

  // Recommendation engine: Personalized Category, Tag & Taste-based matching
  const allRecommendedPins = useMemo(() => {
    if (!post) return [];

    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();

    if (post.id) seenIds.add(post.id);
    if (post.imageUrl) seenUrls.add(post.imageUrl);

    const otherPublished = posts.filter((p) => {
      if (p.id === post.id || p.status !== 'published') return false;
      if (p.imageUrl && seenUrls.has(p.imageUrl)) return false;
      return true;
    });

    const targetTags = new Set((post.tags || []).map((t) => t.toLowerCase()));
    const targetCategory = post.category?.toLowerCase();

    const scored = otherPublished.map((item) => {
      let score = 0;
      if (item.category?.toLowerCase() === targetCategory) score += 15;
      if (item.tags) {
        item.tags.forEach((t) => {
          if (targetTags.has(t.toLowerCase())) score += 8;
        });
      }
      if (item.aiTool === post.aiTool) score += 3;

      const aiMatch = PersonalizationEngine.scorePrompt(item, tasteProfile, bookmarkedIds);
      score += aiMatch.score * 0.4;

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const deduped: PromptPost[] = [];
    for (const match of scored) {
      if (!seenIds.has(match.item.id)) {
        seenIds.add(match.item.id);
        deduped.push(match.item);
      }
    }

    return deduped;
  }, [post, posts, tasteProfile, bookmarkedIds]);

  const hasMorePins = displayedCount < allRecommendedPins.length;

  const loadMorePins = useCallback(() => {
    if (isLoadingMore || !hasMorePins) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + 12, allRecommendedPins.length));
      setIsLoadingMore(false);
    }, 250);
  }, [isLoadingMore, hasMorePins, allRecommendedPins.length]);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel || !hasMorePins) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePins();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMorePins, hasMorePins]);

  const visiblePins = allRecommendedPins.slice(0, displayedCount);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E60023] mb-3" />
        <p className="text-sm font-semibold text-neutral-500">Loading prompt details...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4 text-neutral-400">
            <SearchX className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Prompt Not Found</h1>
          <p className="text-sm text-neutral-500 mb-6">
            This prompt pin might have been unlisted or moved to another link.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all shadow-md"
          >
            Explore All Prompts
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Top Breadcrumbs & Back Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 overflow-x-auto no-scrollbar py-1">
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 shrink-0 font-medium">
              <Home className="w-3.5 h-3.5" />
              <span>Explore</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
              {post.category || 'Prompts'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-sm">
              {post.title}
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors shadow-xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Feed</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        {/* Master Showcase Card (Pinterest 2-Column Desktop / Stacked Mobile Layout) */}
        <section className="bg-white dark:bg-neutral-900 rounded-[32px] sm:rounded-[40px] border border-neutral-200/80 dark:border-neutral-800 shadow-xl overflow-hidden mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            {/* Left Column: High Resolution Visual Asset */}
            <div className="lg:col-span-6 xl:col-span-7 bg-neutral-950 relative flex items-center justify-center p-3 sm:p-6 select-none group min-h-[380px] sm:min-h-[480px]">
              {post.imageUrl ? (
                <div
                  onClick={() => setShowFullImageModal(true)}
                  className="relative w-full h-full max-h-[750px] min-h-[360px] flex items-center justify-center cursor-zoom-in"
                >
                  <Image
                    src={post.imageUrl}
                    alt={post.imageAlt || post.title}
                    width={900}
                    height={1200}
                    priority
                    draggable={false}
                    className="max-w-full max-h-[720px] w-auto h-auto object-contain rounded-2xl sm:rounded-3xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                  {/* Zoom Overlay Indicator */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullImageModal(true);
                    }}
                    className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-transform hover:scale-110 shadow-lg"
                    title="Open Fullscreen View"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-[4/5] flex items-center justify-center text-neutral-600">
                  <Sparkles className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>

            {/* Right Column: Prompt Details, Copy Box, Actions */}
            <div className="lg:col-span-6 xl:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              {/* Header Info & Badges */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1 rounded-full bg-[#E60023]/10 text-[#E60023] border border-[#E60023]/20 text-xs font-black tracking-wide uppercase">
                      {post.aiTool || 'AI Prompt'}
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                      {post.category}
                    </span>
                  </div>

                  {/* Top Action Pills (Save, Like, Share) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBookmark}
                      className={`p-2.5 rounded-full border transition-all ${
                        isBookmarked
                          ? 'bg-[#E60023] text-white border-[#E60023] shadow-md shadow-red-500/20'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                      }`}
                      title={isBookmarked ? 'Saved to Collection (Click to remove)' : 'Save Pin'}
                    >
                      {isBookmarked ? <Bookmark className="w-4 h-4 fill-white" /> : <Bookmark className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleLike}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-all ${
                        isLiked
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200 dark:border-rose-800'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                      }`}
                      title="Like Prompt"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{post.likesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors"
                      title="Share Prompt Link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white leading-snug">
                  {post.title}
                </h1>

                {/* Author & Stats Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                      <Image
                        src="/logo.png"
                        alt="Author"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-neutral-200">
                        {post.author?.name || 'tool.reelz'}
                      </span>
                      <span className="text-[11px] text-neutral-400 block">Verified Creator</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1 text-neutral-500">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{post.viewsCount || 1} views</span>
                    </span>
                    <span className="flex items-center gap-1 text-neutral-500">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{post.copiesCount || 0} copies</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Master Copy-Paste Prompt Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Master Copy-Paste Prompt
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {post.promptText.length} chars
                  </span>
                </div>

                <div
                  onClick={handleCopyMasterPrompt}
                  className="relative group/box p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-[#E60023]/60 transition-all shadow-inner"
                  title="Click to copy full prompt"
                >
                  <p className="text-xs sm:text-sm font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap select-all">
                    {post.promptText}
                  </p>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
                    <span className="text-[11px] text-neutral-400 font-sans">
                      {copiedPrompt ? 'Copied to clipboard!' : 'Click text to copy'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyMasterPrompt();
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        copiedPrompt
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-[#E60023] hover:bg-[#ad081b] text-white shadow-red-500/20'
                      }`}
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags & Action Buttons */}
              <div className="space-y-4 pt-2">
                {/* Tag Pills */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-neutral-400 mr-1" />
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-bold text-xs shadow-md transition-all active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                    <span>Generate in AI Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={isDownloadingImage}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all border border-neutral-200 dark:border-neutral-700 active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingImage ? 'Downloading...' : 'Download Image'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* "More to Explore" Masonry Recommendation Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                More Like This
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Explore curated prompts with matching aesthetics and style tags
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-bold text-[#E60023] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {visiblePins.length > 0 ? (
            <>
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [column-fill:_balance]">
                {visiblePins.map((pin) => (
                  <PromptCard key={pin.id} post={pin} />
                ))}
              </div>

              {/* Sentinel for infinite scroll recommendations */}
              <div ref={bottomSentinelRef} className="w-full h-10" />

              {hasMorePins ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-neutral-500 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E60023]" />
                  <span>Loading more visual pins...</span>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-neutral-400">
                  You&apos;ve reached the end of recommended prompts.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6">
              <p className="text-xs text-neutral-500">
                Browse our homepage to discover hundreds of other trending prompts.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Fullscreen High-Resolution Lightbox Modal */}
      {showFullImageModal && post.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setShowFullImageModal(false)}
        >
          <button
            type="button"
            onClick={() => setShowFullImageModal(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={post.imageUrl}
              alt={post.title}
              width={1600}
              height={2000}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Global Context Modals */}
      <BookmarksDrawer />
      <UserAuthModal />
      <AdminLoginModal />
      <TasteProfileModal />
      <SearchExploreModal />

      <Footer />
      <BottomNav />
    </div>
  );
}

export default function SinglePromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <AppProvider>
      <SinglePromptDetailContent id={resolvedParams.id} />
    </AppProvider>
  );
}
