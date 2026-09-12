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
  Crown,
  Lock,
  ArrowRight,
  Coins,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import Link from 'next/link';
import { PersonalizationEngine } from '@/lib/personalization';
import { getPromptSlug, slugify, getOptimizedImageUrl, detectPostAspectRatio, getPromptMetaDescription } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface RecommendedPinCardProps {
  pin: PromptPost;
  isPinBookmarked: boolean;
  isCopied: boolean;
  isUnlocked?: boolean;
  isProUser?: boolean;
  onSelect: (pin: PromptPost) => void;
  onGenerate: (e: React.MouseEvent, pin: PromptPost) => void;
  onCopy: (e: React.MouseEvent, pin: PromptPost) => void;
  onToggleBookmark: (e: React.MouseEvent, pin: PromptPost) => void;
}

const RecommendedPinCard: React.FC<RecommendedPinCardProps> = ({
  pin,
  isPinBookmarked,
  isCopied,
  isUnlocked,
  isProUser,
  onSelect,
  onGenerate,
  onCopy,
  onToggleBookmark,
}) => {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const detectedRatio = detectPostAspectRatio(pin);

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
      { rootMargin: '80px 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(pin)}
      style={{ aspectRatio: detectedRatio }}
      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-300 border border-neutral-200/60 dark:border-neutral-800/80 w-full"
      id={`masonry-pin-${pin.id}`}
    >
      {/* Shimmer Placeholder */}
      {(!loaded || !inView) && pin.imageUrl && (
        <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
      )}

      {/* Premium Badge */}
      {pin.isPremium && (
        <div className={`absolute top-2 left-2 z-10 flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-md shadow-md pointer-events-none ${
          isUnlocked && !isProUser
            ? 'bg-emerald-950/85 border border-emerald-400/60 text-emerald-300'
            : 'bg-black/85 border border-amber-400/60 text-amber-300'
        }`}>
          <Crown className={`w-3 h-3 ${isUnlocked && !isProUser ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'}`} />
        </div>
      )}

      {/* Photo Pin Image (rendered ONLY when inView is true) */}
      {pin.imageUrl && inView && (
        <Image
          src={getOptimizedImageUrl(pin.imageUrl, 500)}
          alt={pin.imageAlt || pin.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          onLoad={() => setLoaded(true)}
          className={`object-cover group-hover:scale-105 transition-all duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
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
    isProUser,
    toolCredits,
    unlockedPromptIds,
    unlockPromptWithCredit,
    isPromptUnlocked,
  } = useApp();

  const INITIAL_RECOMMENDED_COUNT = 15;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(INITIAL_RECOMMENDED_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);
  const [historyStack, setHistoryStack] = useState<PromptPost[]>(() => (selectedPost ? [selectedPost] : []));

  const router = useRouter();

  // Cleanly synchronize historyStack whenever selectedPost changes
  useEffect(() => {
    if (!selectedPost) {
      setHistoryStack([]);
      return;
    }
    setHistoryStack((prev) => {
      if (prev.length === 0) return [selectedPost];
      if (prev[prev.length - 1]?.id === selectedPost.id) return prev;
      const existingIdx = prev.findIndex((p) => p.id === selectedPost.id);
      if (existingIdx !== -1) {
        return prev.slice(0, existingIdx + 1);
      }
      return [...prev, selectedPost];
    });
    setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
  }, [selectedPost]);

  // Dynamic SEO description & title updates for active prompt modal
  useEffect(() => {
    if (!selectedPost) return;
    const cleanTitle = `${selectedPost.title} - AI Photo Prompt & Settings`;
    const metaDesc = getPromptMetaDescription(selectedPost);
    document.title = cleanTitle;

    let metaDescTag = document.querySelector('meta[name="description"]');
    if (!metaDescTag) {
      metaDescTag = document.createElement('meta');
      metaDescTag.setAttribute('name', 'description');
      document.head.appendChild(metaDescTag);
    }
    metaDescTag.setAttribute('content', metaDesc);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', cleanTitle);
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', metaDesc);

    return () => {
      document.title = 'Trending Copy Paste Photo Prompts';
      if (metaDescTag) {
        metaDescTag.setAttribute(
          'content',
          'Explore trending copy paste photo prompts for Midjourney, ChatGPT, Flux, Claude and Gemini. Instant copy, high-res previews, and creative AI prompt settings.'
        );
      }
    };
  }, [selectedPost]);

  const isLiked = selectedPost ? likedIds?.includes(selectedPost.id) : false;
  const currentPost = posts.find((p) => p.id === selectedPost?.id) || selectedPost;
  const currentLikesCount = currentPost?.likesCount ?? selectedPost?.likesCount ?? 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedPost(null);
    setHistoryStack([]);
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path !== '/' && path !== '/dashboard' && path !== '/create' && !path.startsWith('/admin') && !path.startsWith('/blog')) {
        window.history.pushState(null, '', '/');
      }
    }
  }, [setSelectedPost]);

  const handleGoBack = useCallback(() => {
    if (historyStack.length > 1) {
      // If browser history has previous prompt steps from this session, go back smoothly
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
        return;
      }
      // Fallback: manually pop stack and update
      const newStack = [...historyStack];
      newStack.pop();
      const prevPost = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      setSelectedPost(prevPost);
      if (typeof window !== 'undefined') {
        const prevSlug = getPromptSlug(prevPost);
        window.history.replaceState({ postId: prevPost.id, isPromptDetail: true }, '', `/${prevSlug}`);
      }
      setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
    } else {
      closeModal();
    }
  }, [historyStack, closeModal, setSelectedPost]);

  // Handle browser back / forward navigation and Escape key
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      if (path === '/' || path === '' || path === '/dashboard' || path === '/create' || path.startsWith('/admin') || path.startsWith('/blog')) {
        setSelectedPost(null);
        setHistoryStack([]);
        return;
      }
      if (path.length > 1) {
        const statePostId = event.state?.postId;
        let matched: PromptPost | undefined;

        if (statePostId) {
          matched = posts.find((p) => p.id === statePostId);
        }

        const rawSlug = path.replace('/', '').split('/')[0];
        const targetSlug = decodeURIComponent(rawSlug).toLowerCase().trim();

        if (!matched) {
          matched = posts.find((p) => {
            if (p.slug && (p.slug.toLowerCase() === targetSlug || slugify(p.slug) === targetSlug)) return true;
            if (p.id && p.id.toLowerCase() === targetSlug) return true;
            if (p.title && (p.title.toLowerCase() === targetSlug || slugify(p.title) === targetSlug)) return true;
            return false;
          });
        }

        if (matched) {
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
          setSelectedPost(matched);
          setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
        } else {
          fetch(`/api/posts/${encodeURIComponent(targetSlug)}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .then((data) => {
              if (data.success && data.post) {
                if (containerRef.current) {
                  containerRef.current.scrollTop = 0;
                }
                setSelectedPost(data.post);
                setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
              }
            })
            .catch(() => {});
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
    const isUnlocked = isPromptUnlocked(selectedPost.id, selectedPost.isPremium);
    if (!isUnlocked) {
      if (toolCredits >= 1) {
        const res = unlockPromptWithCredit(selectedPost.id);
        if (!res.success) {
          setIsUnlockModalOpen(true);
          return;
        }
        try {
          confetti({
            particleCount: 60,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#E60023'],
          });
        } catch {}
        showToast('Prompt unlocked! 1 credit used 🎉');
      } else {
        setIsUnlockModalOpen(true);
        return;
      }
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auraprompt_studio_preload', selectedPost.promptText);
      sessionStorage.setItem('promptcms_studio_preload', selectedPost.promptText);
      if (selectedPost.imageUrl) {
        sessionStorage.setItem('promptcms_studio_image_preload', selectedPost.imageUrl);
      }
    }
    setSelectedPost(null);
    router.push('/create');
    showToast('Loaded prompt into Create Studio!');
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

  // Recommendation engine: Relevance Scoring & Matching Algorithm
  const allRecommendedPins = useMemo(() => {
    if (!selectedPost) return [];

    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();

    if (selectedPost.id) seenIds.add(selectedPost.id);
    if (selectedPost.imageUrl) seenUrls.add(selectedPost.imageUrl);

    // 1. Filter all available posts excluding the current active post
    const otherPublished = posts.filter((p) => {
      if (!p || p.id === selectedPost.id || p.status !== 'published') return false;
      if (p.imageUrl && seenUrls.has(p.imageUrl)) return false;
      return true;
    });

    // Target category & tags for matching
    const targetCategory = selectedPost.category?.trim().toLowerCase();
    const targetTags = new Set(
      (selectedPost.tags || [])
        .map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : ''))
        .filter(Boolean)
    );

    // 2. Calculate relevance score for each remaining post based on:
    //    - Category Match: +5 points if post.category matches current post's category
    //    - Tag Overlap: +2 points for every matching tag in post.tags and current post's tags
    const scored = otherPublished.map((post) => {
      let score = 0;

      // Category Match: +5 points
      const postCategory = post.category?.trim().toLowerCase();
      if (targetCategory && postCategory && postCategory === targetCategory) {
        score += 5;
      }

      // Tag Overlap: +2 points for every matching tag
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          const cleanTag = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
          if (cleanTag && targetTags.has(cleanTag)) {
            score += 2;
          }
        });
      }

      return { post, score };
    });

    // 3. Sort posts descending by their total relevance score
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Stable secondary tie-breaker: newest first
      const timeA = new Date(a.post.createdAt || 0).getTime();
      const timeB = new Date(b.post.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // 4. Arrange posts in descending score order with deduplication
    const combined: PromptPost[] = [];

    scored.forEach(({ post }) => {
      if (
        !seenIds.has(post.id) &&
        (!post.imageUrl || !seenUrls.has(post.imageUrl))
      ) {
        seenIds.add(post.id);
        if (post.imageUrl) seenUrls.add(post.imageUrl);
        combined.push(post);
      }
    });

    return combined;
  }, [selectedPost, posts]);

  const hasMorePins = displayedCount < allRecommendedPins.length;

  // Infinite scroll loader trigger (10 pins per batch)
  const loadMorePins = useCallback(() => {
    if (isLoadingMore || !hasMorePins) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => prev + 10);
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

  const visiblePins = useMemo(() => {
    return allRecommendedPins.slice(0, displayedCount);
  }, [allRecommendedPins, displayedCount]);

  const [columnCount, setColumnCount] = useState<number>(2);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1280) {
        setColumnCount(5);
      } else if (width >= 1024) {
        setColumnCount(4);
      } else if (width >= 640) {
        setColumnCount(3);
      } else {
        setColumnCount(2);
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  const recommendedColumns = useMemo(() => {
    const cols: PromptPost[][] = Array.from({ length: columnCount }, () => []);
    visiblePins.forEach((pin, idx) => {
      cols[idx % columnCount].push(pin);
    });
    return cols;
  }, [visiblePins, columnCount]);

  if (!selectedPost) return null;

  const isBookmarked = bookmarkedIds.includes(selectedPost.id);
  const isUnlocked = isPromptUnlocked(selectedPost.id, selectedPost.isPremium);
  const isPromptGated = Boolean(selectedPost.isPremium && !isUnlocked);

  const handleUnlockWithOneCredit = () => {
    if (!selectedPost) return;
    if (toolCredits >= 1) {
      const res = unlockPromptWithCredit(selectedPost.id);
      if (res.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#E60023'],
          });
        } catch {}
        showToast('Prompt unlocked! 1 credit used 🎉');
      } else {
        showToast(res.message);
        setIsUnlockModalOpen(true);
      }
    } else {
      showToast(`You need 1 credit to unlock this prompt (Balance: ${toolCredits}). Top up credits or subscribe!`);
      setIsUnlockModalOpen(true);
    }
  };

  const handleCopyMasterPrompt = () => {
    if (isPromptGated) {
      if (toolCredits >= 1) {
        const res = unlockPromptWithCredit(selectedPost.id);
        if (res.success) {
          copyPromptToClipboard(selectedPost.promptText, selectedPost.id);
          setCopiedPrompt(true);
          setTimeout(() => setCopiedPrompt(false), 2000);
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#E60023'],
            });
          } catch {}
          showToast('Prompt unlocked and copied! 1 credit used 🎉');
          return;
        }
      }
      setIsUnlockModalOpen(true);
      return;
    }
    copyPromptToClipboard(selectedPost.promptText, selectedPost.id);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleQuickCopyPin = (e: React.MouseEvent, pin: PromptPost) => {
    e.stopPropagation();
    const isPinUnlocked = isPromptUnlocked(pin.id, pin.isPremium);
    if (!isPinUnlocked) {
      if (toolCredits >= 1) {
        const res = unlockPromptWithCredit(pin.id);
        if (res.success) {
          copyPromptToClipboard(pin.promptText, pin.id);
          setCopiedPinId(pin.id);
          setTimeout(() => setCopiedPinId(null), 2000);
          try {
            confetti({
              particleCount: 60,
              spread: 50,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#E60023'],
            });
          } catch {}
          showToast('Prompt unlocked and copied! 1 credit used 🎉');
          return;
        }
      }
      setIsUnlockModalOpen(true);
      return;
    }
    copyPromptToClipboard(pin.promptText, pin.id);
    setCopiedPinId(pin.id);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const handleShare = async () => {
    const shareSlug = getPromptSlug(selectedPost);
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${shareSlug}` : '';
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
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    const pinSlug = getPromptSlug(pin);
    if (typeof window !== 'undefined') {
      window.history.pushState({ postId: pin.id, isPromptDetail: true }, '', `/${pinSlug}`);
    }
    setSelectedPost(pin);
    setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
  };

  const handleDeconstructImage = () => {
    if (!selectedPost) return;
    if (isPromptGated) {
      setIsUnlockModalOpen(true);
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auraprompt_studio_preload', selectedPost.promptText);
      sessionStorage.setItem('promptcms_studio_preload', selectedPost.promptText);
      if (selectedPost.imageUrl) {
        sessionStorage.setItem('promptcms_studio_image_preload', selectedPost.imageUrl);
      }
    }
    setSelectedPost(null);
    router.push('/create');
    showToast('Loaded image & prompt into Create Studio!');
  };

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
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm transition-all shadow-sm group min-h-[40px]"
            id="back-to-prompts-btn"
            title={historyStack.length > 1 ? 'Go back to previous prompt card' : 'Back to explore feed'}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="inline sm:hidden">
              {historyStack.length > 1 ? 'Back' : 'Feed'}
            </span>
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
            {/* Left Column: Edge-to-Edge High-Resolution Photo Showcase */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              className="lg:col-span-7 bg-neutral-100 dark:bg-neutral-900 flex flex-col justify-start items-center p-0 relative group select-none overflow-hidden"
            >
              {selectedPost.imageUrl ? (
                <div
                  onContextMenu={(e) => e.preventDefault()}
                  className="relative w-full overflow-hidden flex items-center justify-center select-none"
                >
                  <Image
                    src={getOptimizedImageUrl(selectedPost.imageUrl, 1200)}
                    alt={selectedPost.imageAlt || selectedPost.title}
                    width={selectedPost.imageWidth || 1200}
                    height={selectedPost.imageHeight || 1600}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    draggable={false}
                    className="w-full h-auto block select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                    priority
                    decoding="async"
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
                    {selectedPost.isPremium && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black tracking-wider uppercase flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>PRO PREVIEW</span>
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60">
                      {selectedPost.category}
                    </span>
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
                  {selectedPost.isPremium && (
                    <div className="flex items-center justify-end gap-2">
                      {isUnlocked && !isProUser && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>UNLOCKED</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                        <Crown className="w-3 h-3 fill-amber-500" />
                        <span>PRO PROMPT</span>
                      </span>
                    </div>
                  )}

                  {isPromptGated ? (
                    <div className="relative rounded-2xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 text-neutral-100 p-5 sm:p-7 border border-amber-500/40 shadow-xl overflow-hidden text-center flex flex-col items-center justify-center">
                      {/* Obscured blurred background accents */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 filter blur-xs select-none opacity-15 pointer-events-none p-4 font-mono text-xs leading-relaxed overflow-hidden text-left"
                      >
                        <p>Cinematic hyperrealistic photography shot on Hasselblad 50mm f/1.2 lens, photorealistic studio lighting, delicate cinematic color grading, 8k resolution...</p>
                        <p>--ar 16:9 --style raw --v 6.1 --s 250 --quality 2 --uplight --no blur, grain</p>
                        <p>Masterpiece, highly detailed textures, depth of field, volumetric atmospheric glow...</p>
                      </div>

                      {/* Content in natural flow so height dynamically expands and layout never gets cut off */}
                      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-3 sm:space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-md shrink-0">
                          <Lock className="w-5 h-5" />
                        </div>

                        <div className="space-y-1.5 text-center">
                          <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-2 flex-wrap">
                            <span>Premium Prompt Locked</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                              1 Credit
                            </span>
                          </h3>
                          <p className="text-xs sm:text-sm text-neutral-300 max-w-sm mx-auto leading-relaxed font-sans">
                            Unlock this prompt permanently with <strong className="text-white">1 credit</strong> (Balance: <strong className="text-amber-400">{toolCredits} Credits</strong>), or subscribe for unlimited access.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 w-full pt-1">
                          <button
                            type="button"
                            onClick={handleUnlockWithOneCredit}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95 font-sans cursor-pointer flex-auto sm:flex-none"
                          >
                            <Coins className="w-4 h-4 fill-black shrink-0" />
                            <span className="whitespace-nowrap">{toolCredits >= 1 ? `Unlock for 1 Credit (${toolCredits} Left)` : 'Unlock for 1 Credit (0 Left)'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsUnlockModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-bold border border-neutral-700 transition-colors font-sans cursor-pointer flex-auto sm:flex-none"
                          >
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="whitespace-nowrap">Get Credits / Pro</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )}
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

          {/* Responsive Visual Pins Stable Flex Columns */}
          <div className="flex gap-3 sm:gap-4 items-start w-full" id="more-explore-masonry">
            {recommendedColumns.map((colPins, colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-3 sm:gap-4 min-w-0">
                {colPins.map((pin) => (
                  <RecommendedPinCard
                    key={pin.id}
                    pin={pin}
                    isPinBookmarked={bookmarkedIds.includes(pin.id)}
                    isCopied={copiedPinId === pin.id}
                    isUnlocked={isPromptUnlocked(pin.id, pin.isPremium)}
                    isProUser={isProUser}
                    onSelect={handleSelectPin}
                    onGenerate={(e, p) => {
                      e.stopPropagation();
                      const isPinUnlocked = isPromptUnlocked(p.id, p.isPremium);
                      if (!isPinUnlocked) {
                        if (toolCredits >= 1) {
                          const res = unlockPromptWithCredit(p.id);
                          if (!res.success) {
                            setIsUnlockModalOpen(true);
                            return;
                          }
                          try {
                            confetti({
                              particleCount: 60,
                              spread: 50,
                              origin: { y: 0.6 },
                              colors: ['#FFD700', '#FFA500', '#E60023'],
                            });
                          } catch {}
                          showToast('Prompt unlocked! 1 credit used 🎉');
                        } else {
                          setIsUnlockModalOpen(true);
                          return;
                        }
                      }
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('auraprompt_studio_preload', p.promptText);
                        sessionStorage.setItem('promptcms_studio_preload', p.promptText);
                        if (p.imageUrl) {
                          sessionStorage.setItem('promptcms_studio_image_preload', p.imageUrl);
                        }
                      }
                      setSelectedPost(null);
                      router.push('/create');
                      showToast('Loaded prompt into Create Studio!');
                    }}
                    onCopy={(e, p) => handleQuickCopyPin(e, p)}
                    onToggleBookmark={(e, p) => {
                      e.stopPropagation();
                      toggleBookmark(p.id);
                    }}
                  />
                ))}
              </div>
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

      {/* Unlock Premium Prompts Popup Modal */}
      {isUnlockModalOpen && (
        <div
          onClick={() => setIsUnlockModalOpen(false)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          id="unlock-premium-prompt-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] border border-amber-300 dark:border-amber-700/60 shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-scale-in"
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setIsUnlockModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Crown Icon */}
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
              <Crown className="w-8 h-8 fill-amber-500" />
            </div>

            {/* Header Text */}
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                PRO MEMBERSHIP REQUIRED
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Unlock Premium Prompts
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                This prompt is exclusive to Pro members. Upgrade to any plan to reveal prompt text, copy instantly, and receive daily AI tools credits.
              </p>
            </div>

            {/* 3 Plans Quick Comparison */}
            <div className="grid grid-cols-3 gap-2 text-left pt-1">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-center">
                <div className="text-[10px] font-bold text-neutral-500 uppercase">Starter</div>
                <div className="text-base font-black text-neutral-900 dark:text-white">₹49</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">10 Credits</div>
                <div className="text-[9px] text-neutral-400">1 Request</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-600 text-center relative shadow-sm">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-amber-500 text-[8px] font-black text-white uppercase">
                  Popular
                </span>
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Pro</div>
                <div className="text-base font-black text-neutral-900 dark:text-white">₹199</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">50 Credits</div>
                <div className="text-[9px] text-neutral-400">3 Requests</div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-center">
                <div className="text-[10px] font-bold text-neutral-500 uppercase">VIP</div>
                <div className="text-base font-black text-neutral-900 dark:text-white">₹499</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">200 Credits</div>
                <div className="text-[9px] text-neutral-400">10 Requests</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsUnlockModalOpen(false);
                  closeModal();
                  router.push('/pricing');
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-sm shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer font-sans"
              >
                <Crown className="w-4 h-4 fill-black" />
                <span>View Pricing & Unlock (From ₹49/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
