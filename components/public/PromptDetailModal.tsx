'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PromptPost } from '@/types/prompt';
import { useApp } from '@/context/AppContext';
import {
  X,
  Copy,
  Check,
  Bookmark,
  Sparkles,
  Share2,
  Calendar,
  Eye,
  HelpCircle,
  ArrowLeft,
  Heart,
  Layers,
  ChevronRight,
  Maximize2,
  Download,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PersonalizationEngine } from '@/lib/personalization';
import { getPromptSlug, slugify, getOptimizedImageUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface RecommendedPinCardProps {
  pin: PromptPost;
  isPinBookmarked: boolean;
  isCopied: boolean;
  onSelect: (pin: PromptPost) => void;
  onGenerate: (e: React.MouseEvent, pin: PromptPost) => void;
  onCopy: (e: React.MouseEvent, pin: PromptPost) => void;
  onToggleBookmark: (e: React.MouseEvent, pin: PromptPost) => void;
}

const RecommendedPinCard: React.FC<RecommendedPinCardProps> = ({
  pin,
  isPinBookmarked,
  isCopied,
  onSelect,
  onGenerate,
  onCopy,
  onToggleBookmark,
}) => {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '60px 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(pin)}
      className="break-inside-avoid group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-300 border border-neutral-200/60 dark:border-neutral-800/80 min-h-[160px]"
      id={`masonry-pin-${pin.id}`}
    >
      {/* Shimmer Placeholder */}
      {(!loaded || !inView) && pin.imageUrl && (
        <div className="w-full aspect-[3/4] bg-neutral-200 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
      )}

      {/* Photo Pin Image (rendered ONLY when inView is true) */}
      {pin.imageUrl && inView && (
        <Image
          src={getOptimizedImageUrl(pin.imageUrl, 500)}
          alt={pin.imageAlt || pin.title}
          width={600}
          height={800}
          onLoad={() => setLoaded(true)}
          className={`w-full h-auto object-cover group-hover:scale-105 transition-all duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
      )}

      {/* Dark Vignette Overlay on Hover */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 pointer-events-none">
        {/* Top Actions */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <button
            type="button"
            onClick={(e) => onGenerate(e, pin)}
            className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 text-[10px] font-bold shadow-md transition-transform hover:scale-105 flex items-center gap-1"
            title="Generate Image with this prompt"
          >
            <Sparkles className="w-3 h-3 text-[#E60023]" />
            <span>Generate</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => onCopy(e, pin)}
              className="p-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-md transition-all hover:scale-105"
              title="Quick Copy Prompt"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => onToggleBookmark(e, pin)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md transition-all hover:scale-105 flex items-center gap-1 ${
                isPinBookmarked
                  ? 'bg-white text-[#E60023]'
                  : 'bg-white hover:bg-neutral-100 text-neutral-900'
              }`}
              title={isPinBookmarked ? 'Saved to collection' : 'Save Pin'}
            >
              <Bookmark className={`w-3 h-3 ${isPinBookmarked ? 'fill-[#E60023] text-[#E60023]' : ''}`} />
              <span>{isPinBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Info: Category & Title */}
        <div className="pointer-events-auto">
          <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[9px] font-bold text-white mb-1 inline-block">
            {pin.category}
          </span>
          <p className="text-xs font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
            {pin.title}
          </p>
        </div>
      </div>
    </div>
  );
};

export const PromptDetailModal = () => {
  const {
    selectedPost,
    setSelectedPost,
    copyPromptToClipboard,
    toggleBookmark,
    toggleLike,
    likedIds,
    bookmarkedIds,
    posts,
    setPosts,
    tasteProfile,
    showToast,
    setCurrentView,
  } = useApp();

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(5);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [historyStack, setHistoryStack] = useState<PromptPost[]>(() => (selectedPost ? [selectedPost] : []));
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(selectedPost?.id || null);

  const router = useRouter();

  // Keep historyStack synchronized with selectedPost during render
  if (selectedPost && selectedPost.id !== prevSelectedId) {
    setPrevSelectedId(selectedPost.id);
    if (historyStack.length === 0 || !historyStack.some((p) => p.id === selectedPost.id)) {
      setHistoryStack((prev) => (prev.length === 0 ? [selectedPost] : [...prev, selectedPost]));
    }
  } else if (!selectedPost && prevSelectedId !== null) {
    setPrevSelectedId(null);
    if (historyStack.length > 0) {
      setHistoryStack([]);
    }
  }

  const isLiked = selectedPost ? likedIds?.includes(selectedPost.id) : false;
  const currentPost = posts.find((p) => p.id === selectedPost?.id) || selectedPost;
  const currentLikesCount = currentPost?.likesCount ?? selectedPost?.likesCount ?? 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    setSelectedPost(null);
    setHistoryStack([]);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      if (window.location.pathname.startsWith('/prompt')) {
        router.push('/');
      }
    }
  }, [setSelectedPost, router]);

  const handleGoBack = useCallback(() => {
    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop(); // Remove active prompt
      const prevPost = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      setSelectedPost(prevPost);
      if (typeof window !== 'undefined') {
        const prevSlug = getPromptSlug(prevPost);
        window.history.pushState({ postId: prevPost.id }, '', `/prompt/${prevSlug}`);
      }
      setDisplayedCount(5);
    } else {
      closeModal();
    }
  }, [historyStack, closeModal, setSelectedPost]);

  // Handle browser back / forward navigation and Escape key
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path === '/' || path === '' || !path.startsWith('/prompt')) {
          setSelectedPost(null);
          setHistoryStack([]);
        } else if (path.startsWith('/prompt/')) {
          const rawSlug = path.replace('/prompt/', '').split('/')[0];
          const targetSlug = decodeURIComponent(rawSlug).toLowerCase().trim();
          const matched = posts.find((p) => {
            if (p.slug && (p.slug.toLowerCase() === targetSlug || slugify(p.slug) === targetSlug)) return true;
            if (p.id && p.id.toLowerCase() === targetSlug) return true;
            if (p.title && (p.title.toLowerCase() === targetSlug || slugify(p.title) === targetSlug)) return true;
            return false;
          });
          if (matched) {
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
            setSelectedPost(matched);
            setHistoryStack((prev) => {
              const idx = prev.findIndex((p) => p.id === matched.id);
              if (idx !== -1) return prev.slice(0, idx + 1);
              return [...prev, matched];
            });
            setDisplayedCount(5);
          } else {
            fetch(`/api/posts/${encodeURIComponent(targetSlug)}`)
              .then((res) => (res.ok ? res.json() : Promise.reject(res)))
              .then((data) => {
                if (data.success && data.post) {
                  if (containerRef.current) {
                    containerRef.current.scrollTop = 0;
                  }
                  setSelectedPost(data.post);
                  setHistoryStack((prev) => {
                    const idx = prev.findIndex((p) => p.id === data.post.id);
                    if (idx !== -1) return prev.slice(0, idx + 1);
                    return [...prev, data.post];
                  });
                  setDisplayedCount(5);
                }
              })
              .catch(() => {});
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFullImageModal) {
          setShowFullImageModal(false);
        } else if (selectedPost) {
          handleGoBack();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setSelectedPost, posts, showFullImageModal, selectedPost, handleGoBack]);

  const handleLike = () => {
    if (!selectedPost) return;
    toggleLike(selectedPost.id);
  };

  const handleGenerateImage = () => {
    if (!selectedPost) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auraprompt_studio_preload', selectedPost.promptText);
    }
    closeModal();
    setCurrentView('studio-tool');
    showToast('Loaded prompt into AI Studio Image Generator!');
  };

  const handleDownloadImage = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedPost?.imageUrl) return;

    setIsDownloadingImage(true);
    try {
      showToast('Downloading photo...');
      const response = await fetch(selectedPost.imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response error');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanSlug = selectedPost.slug || selectedPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      link.download = `${cleanSlug}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded successfully!');
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.href = selectedPost.imageUrl;
      link.target = '_blank';
      link.download = `${selectedPost.slug || 'ai-prompt-photo'}.jpg`;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Image downloaded!');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Track genuine view count (1 view per unique user session per prompt)
  useEffect(() => {
    if (selectedPost?.id) {
      const postId = selectedPost.id;
      const sessionKey = `auraprompt_viewed_${postId}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1');
        fetch(`/api/posts/${encodeURIComponent(postId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'view' }),
        }).catch(() => {});
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p))
        );
      }
    }
  }, [selectedPost?.id, setPosts]);

  // Reset scroll and manage body scroll lock
  useEffect(() => {
    if (selectedPost) {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      // Lock background body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPost]);

  // Recommendation engine: Personalized Category, Tag & Taste-based matching with strict deduplication
  const allRecommendedPins = useMemo(() => {
    if (!selectedPost) return [];

    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();

    if (selectedPost.id) seenIds.add(selectedPost.id);
    if (selectedPost.imageUrl) seenUrls.add(selectedPost.imageUrl);

    const otherPublished = posts.filter((p) => {
      if (p.id === selectedPost.id || p.status !== 'published') return false;
      if (p.imageUrl && seenUrls.has(p.imageUrl)) return false;
      return true;
    });

    // 1. Scored matching based on content relevance + personalized taste profile
    const targetTags = new Set((selectedPost.tags || []).map((t) => t.toLowerCase()));
    const targetCategory = selectedPost.category?.toLowerCase();

    const scored = otherPublished.map((post) => {
      let score = 0;
      if (post.category?.toLowerCase() === targetCategory) {
        score += 15;
      }
      if (post.tags) {
        post.tags.forEach((tag) => {
          if (targetTags.has(tag.toLowerCase())) {
            score += 8;
          }
        });
      }
      if (post.aiTool === selectedPost.aiTool) {
        score += 3;
      }

      // Add AI Taste Profile personalization score
      const tasteScore = PersonalizationEngine.scorePrompt(post, tasteProfile, bookmarkedIds).score;
      score += Math.round(tasteScore / 4);

      // slight boost for popularity
      score += Math.min((post.viewsCount || 0) / 2000, 5);
      score += Math.min((post.copiesCount || 0) / 1000, 5);

      return { post, score };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);
    const relevantList = scored.map((item) => item.post);

    // Combine relevant items and deduplicate strictly
    const combined: PromptPost[] = [];

    relevantList.forEach((p) => {
      if (
        !seenIds.has(p.id) &&
        (!p.imageUrl || !seenUrls.has(p.imageUrl))
      ) {
        seenIds.add(p.id);
        if (p.imageUrl) seenUrls.add(p.imageUrl);
        combined.push(p);
      }
    });

    return combined;
  }, [selectedPost, posts, tasteProfile, bookmarkedIds]);

  const hasMorePins = displayedCount < allRecommendedPins.length;

  // Infinite scroll loader trigger (5 pins per batch)
  const loadMorePins = useCallback(() => {
    if (isLoadingMore || !hasMorePins) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => prev + 5);
      setIsLoadingMore(false);
    }, 250);
  }, [isLoadingMore, hasMorePins]);

  // Intersection observer for bottom sentinel
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel || !selectedPost || !hasMorePins) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePins();
        }
      },
      { root: containerRef.current, threshold: 0.1, rootMargin: '80px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedPost, loadMorePins, displayedCount, hasMorePins]);

  if (!selectedPost) return null;

  const isBookmarked = bookmarkedIds.includes(selectedPost.id);

  const handleCopyMasterPrompt = () => {
    copyPromptToClipboard(selectedPost.promptText, selectedPost.id);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleQuickCopyPin = (e: React.MouseEvent, pin: PromptPost) => {
    e.stopPropagation();
    copyPromptToClipboard(pin.promptText, pin.id);
    setCopiedPinId(pin.id);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const handleShare = async () => {
    const shareSlug = getPromptSlug(selectedPost);
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/prompt/${shareSlug}` : '';
    const shareData = {
      title: selectedPost.title,
      text: `Check out this photo prompt: ${selectedPost.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Prompt URL copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Prompt URL copied to clipboard!');
      }
    }
  };

  const handleSelectPin = (pin: PromptPost) => {
    PersonalizationEngine.recordView(pin);
    setHistoryStack((prev) => {
      if (prev.length > 0 && prev[prev.length - 1]?.id === pin.id) return prev;
      return [...prev, pin];
    });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setSelectedPost(pin);
    if (typeof window !== 'undefined') {
      const pinSlug = getPromptSlug(pin);
      window.history.pushState({ postId: pin.id }, '', `/prompt/${pinSlug}`);
    }
    setDisplayedCount(5);
  };

  const handleDeconstructImage = () => {
    if (!selectedPost) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', selectedPost.promptText);
      if (selectedPost.imageUrl) {
        sessionStorage.setItem('promptcms_studio_image_preload', selectedPost.imageUrl);
      }
    }
    setSelectedPost(null);
    setCurrentView('studio-tool');
    showToast('Loaded image & prompt into Image-to-Prompt Studio!');
  };

  // Strictly non-repeating visible pins list
  const visiblePins = allRecommendedPins.slice(0, displayedCount);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors flex flex-col animate-fade-in"
      id="pinterest-fullscreen-view"
    >
      {/* Top Pinterest-Style Navigation Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 shadow-sm">
        {/* Left: Back to explore / previous pin button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm transition-all shadow-sm group"
            id="back-to-prompts-btn"
            title={historyStack.length > 1 ? 'Go back to previous prompt card' : 'Back to explore feed'}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">
              {historyStack.length > 1 ? 'Previous Prompt' : 'Explore Prompts'}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-neutral-400">
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              {selectedPost.category}
            </span>
          </div>
        </div>

        {/* Center/Right: Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pinterest Red Save Button */}
          <button
            onClick={() => toggleBookmark(selectedPost.id)}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm transition-all ${
              isBookmarked
                ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                : 'bg-[#E60023] hover:bg-[#ad081b] text-white shadow-[#E60023]/20'
            }`}
            title={isBookmarked ? 'Saved to collection' : 'Save Pin'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-[#efefef] dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700 transition-colors"
            title="Share Prompt Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Close Button */}
          <button
            onClick={closeModal}
            className="p-2.5 rounded-full bg-[#efefef] hover:bg-[#e2e2e2] dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Close View and Return to Home"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-12">
        {/* Pinterest Master Pin Card */}
        <section
          key={selectedPost.id}
          className="bg-white dark:bg-neutral-900 rounded-[28px] sm:rounded-[36px] shadow-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden animate-fade-in transition-all duration-150"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left Column: Natural High-Resolution Photo Showcase */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              className="lg:col-span-7 bg-neutral-950 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-8 relative group min-h-[360px] sm:min-h-[480px] select-none"
            >
              {selectedPost.imageUrl ? (
                <div
                  onContextMenu={(e) => e.preventDefault()}
                  className="relative w-full h-full min-h-[340px] sm:min-h-[460px] max-h-[720px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center select-none"
                >
                  <Image
                    src={getOptimizedImageUrl(selectedPost.imageUrl, 1000)}
                    alt={selectedPost.imageAlt || selectedPost.title}
                    width={1200}
                    height={1200}
                    draggable={false}
                    className="w-full h-auto max-h-[720px] object-contain rounded-2xl sm:rounded-3xl select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                    priority
                  />

                  {/* Action Icons Overlay: Download + Enlarge */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadImage(e)}
                      disabled={isDownloadingImage}
                      className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center"
                      title="Download Image"
                      aria-label="Download Image"
                    >
                      {isDownloadingImage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowFullImageModal(true)}
                      className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center"
                      title="View Full Resolution Image"
                      aria-label="Enlarge Image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[4/3] flex items-center justify-center bg-neutral-900 text-neutral-400">
                  <Sparkles className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>

            {/* Right Column: Pin Details & Master Prompt Box */}
            <div className="lg:col-span-5 p-5 sm:p-8 lg:p-9 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Author Section Replacement: Category & AI Tool Badges + Like, Copy, and Generate Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60">
                      {selectedPost.category}
                    </span>
                    {selectedPost.aiTool && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/60">
                        {selectedPost.aiTool}
                      </span>
                    )}
                  </div>

                  {/* Action Icons: Like, Copy, Generate Image */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={handleLike}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                        isLiked
                          ? 'bg-red-50 dark:bg-red-950/40 text-[#E60023] border-red-200 dark:border-red-900/60 shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:text-[#E60023] hover:border-red-200'
                      }`}
                      title={isLiked ? 'Liked' : 'Like this prompt'}
                      aria-label="Like Prompt"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-[#E60023]' : ''}`} />
                      <span>{currentLikesCount}</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={handleCopyMasterPrompt}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-xs border ${
                        copiedPrompt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title="Copy Master Prompt"
                      aria-label="Copy Master Prompt"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Generate Image Button */}
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E60023] hover:bg-[#ad081b] text-white shadow-sm transition-all active:scale-95"
                      title="Generate Image in AI Studio"
                      aria-label="Generate Image in AI Studio"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>

                {/* Pin Title */}
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white leading-tight tracking-tight">
                    {selectedPost.title}
                  </h1>

                  {/* Metadata Stats - Genuine Counts */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(selectedPost.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{selectedPost.viewsCount || 0} views</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{selectedPost.copiesCount || 0} copies</span>
                    </span>
                  </div>
                </div>

                {/* Master Copyable Prompt Box */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Master Copy-Paste Prompt</span>
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-neutral-950 text-neutral-100 p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed border border-neutral-800 shadow-inner group">
                    <p className="whitespace-pre-wrap select-all selection:bg-red-600 selection:text-white max-h-[220px] overflow-y-auto">
                      {selectedPost.promptText}
                    </p>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-neutral-400 font-sans">
                        {selectedPost.promptText.length} chars
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyMasterPrompt}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-md transition-all ${
                            copiedPrompt
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#E60023] hover:bg-[#ad081b] text-white shadow-[#E60023]/30'
                          }`}
                          id="modal-copy-prompt-btn-inner"
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
                </div>

                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    {selectedPost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Pinterest "More to explore" / "More Prompts" Masonry Image Grid */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>More to explore</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
                  {selectedPost.category}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Visual photo prompts with matching aesthetics & tags. Click any image to open.
              </p>
            </div>

            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Infinite Visual Feed
            </span>
          </div>

          {/* Pinterest Responsive Masonry Columns (Images Only) */}
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
            {visiblePins.map((pin) => (
              <RecommendedPinCard
                key={pin.id}
                pin={pin}
                isPinBookmarked={bookmarkedIds.includes(pin.id)}
                isCopied={copiedPinId === pin.id}
                onSelect={handleSelectPin}
                onGenerate={(e, p) => {
                  e.stopPropagation();
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('auraprompt_studio_preload', p.promptText);
                  }
                  setSelectedPost(null);
                  setCurrentView('studio-tool');
                  showToast('Loaded prompt into AI Studio Image Generator!');
                }}
                onCopy={(e, p) => handleQuickCopyPin(e, p)}
                onToggleBookmark={(e, p) => {
                  e.stopPropagation();
                  toggleBookmark(p.id);
                }}
              />
            ))}
          </div>

          {/* Bottom Infinite Scroll Sentinel & Loader */}
          {hasMorePins ? (
            <div ref={bottomSentinelRef} className="py-10 flex flex-col items-center justify-center text-center">
              {isLoadingMore ? (
                <div className="flex items-center gap-2.5 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  <div className="w-5 h-5 border-2 border-[#E60023] border-t-transparent rounded-full animate-spin" />
                  <span>Loading more visual prompts...</span>
                </div>
              ) : (
                <button
                  onClick={loadMorePins}
                  className="px-6 py-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors shadow-xs"
                >
                  Load More Pins
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-10 px-4 mt-6 border-t border-neutral-200/70 dark:border-neutral-800/70 max-w-md mx-auto">
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                You&apos;ve reached the end of our prompt collection. Come back later for more posts.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Full-Screen Image Lightbox Modal */}
      {showFullImageModal && selectedPost.imageUrl && (
        <div
          onClick={() => setShowFullImageModal(false)}
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in select-none"
        >
          {/* Lightbox Controls: Download + Close */}
          <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(e);
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Download Image"
              aria-label="Download Image"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowFullImageModal(false)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Close Lightbox"
              aria-label="Close Lightbox"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            onContextMenu={(e) => e.preventDefault()}
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center select-none"
          >
            <Image
              src={selectedPost.imageUrl}
              alt={selectedPost.imageAlt || selectedPost.title}
              width={1600}
              height={1600}
              draggable={false}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl select-none pointer-events-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
