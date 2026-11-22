'use client';
/* eslint-disable react-hooks/set-state-in-effect */

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
  HelpCircle,
  ArrowLeft,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Download,
  Crown,
  Lock,
  ArrowRight,
  Coins,
  Edit3,
  Wand2,
  Shirt,
  Glasses,
  ShoppingBag,
  Tag,
  Scissors,
  Footprints,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { startRouteNavigation, pushPromptHistoryState } from '@/lib/navigation';
import { PersonalizationEngine } from '@/lib/personalization';
import { getPromptSlug, slugify, getOptimizedImageUrl, detectPostAspectRatio, getPromptMetaDescription, formatPromptForClipboard } from '@/lib/utils';
import {
  isImageUrlCachedInMemory,
  getCachedImageAspectRatio,
  prepareMoreToExploreCard,
  recordLoadedImageElement,
} from '@/lib/viewport-cache';
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
  onAspectRatioResolved?: (pinId: string, heightOverWidth: number) => void;
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
  onAspectRatioResolved,
}) => {
  const pinImgRef = useRef<HTMLImageElement | null>(null);
  const [resolvedPinRatio, setResolvedPinRatio] = useState<string | null>(() =>
    getCachedImageAspectRatio(pin.imageUrl)
  );
  const detectedPinRatio = detectPostAspectRatio(pin);
  const effectivePinRatio =
    resolvedPinRatio || getCachedImageAspectRatio(pin.imageUrl) || detectedPinRatio;

  const allImages = useMemo(() => {
    const list: string[] = [];
    if (pin.imageUrl && typeof pin.imageUrl === 'string' && pin.imageUrl.trim()) {
      list.push(pin.imageUrl.trim());
    }
    if (Array.isArray(pin.additionalImages)) {
      pin.additionalImages.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    return list;
  }, [pin.imageUrl, pin.additionalImages]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isMultiple = allImages.length > 1;

  const isVerticalSlide = useMemo(() => {
    if (!pin.id) return false;
    let hash = 0;
    for (let i = 0; i < pin.id.length; i++) {
      hash = (hash << 5) - hash + pin.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 5 < 2;
  }, [pin.id]);

  const displayImages = useMemo(() => {
    if (isVerticalSlide) {
      return [...allImages].reverse();
    }
    return allImages;
  }, [allImages, isVerticalSlide]);

  const translateYPercent = useMemo(() => {
    if (!isVerticalSlide || allImages.length === 0) return 0;
    return -((allImages.length - 1 - activeImageIndex) * 100);
  }, [isVerticalSlide, allImages.length, activeImageIndex]);

  const slideInterval = useMemo(() => {
    const durations = [2600, 2700, 2800, 3000];
    if (!pin.id) return durations[0];
    let hash = 0;
    for (let i = 0; i < pin.id.length; i++) {
      hash = (hash << 5) - hash + pin.id.charCodeAt(i);
      hash |= 0;
    }
    return durations[Math.abs(hash) % durations.length];
  }, [pin.id]);

  useEffect(() => {
    if (!isMultiple) return;

    const charCode = pin.id ? pin.id.charCodeAt(pin.id.length - 1) : 0;
    const initialOffset = 2200 + (charCode % 8) * 250;

    let intervalId: NodeJS.Timeout | null = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
      }, slideInterval);
    }, initialOffset);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isMultiple, allImages.length, slideInterval, pin.id]);

  const syncPinRatio = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      recordLoadedImageElement(pin.imageUrl, 360, img);
      const ratioStr = `${img.naturalWidth} / ${img.naturalHeight}`;
      setResolvedPinRatio((prev) => (prev === ratioStr ? prev : ratioStr));
      onAspectRatioResolved?.(pin.id, img.naturalHeight / img.naturalWidth);
    },
    [pin.id, pin.imageUrl, onAspectRatioResolved]
  );

  useEffect(() => {
    const img = pinImgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      syncPinRatio(img);
    }
  }, [pin.imageUrl, syncPinRatio]);

  return (
    <div
      onClick={() => onSelect(pin)}
      onMouseEnter={() => prepareMoreToExploreCard(pin)}
      onTouchStart={() => prepareMoreToExploreCard(pin)}
      style={{ aspectRatio: effectivePinRatio }}
      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 cursor-pointer border border-neutral-200/60 dark:border-neutral-800/80 w-full select-none"
      id={`masonry-pin-${pin.id}`}
    >
      {/* Premium Badge */}
      {pin.isPremium && (
        <div className={`absolute top-2 left-2 z-20 flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-md shadow-md pointer-events-none ${
          isUnlocked && !isProUser
            ? 'bg-emerald-950/85 border border-emerald-400/60 text-emerald-300'
            : 'bg-black/85 border border-amber-400/60 text-amber-300'
        }`}>
          <Crown className={`w-3 h-3 ${isUnlocked && !isProUser ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'}`} />
        </div>
      )}

      {/* Photo Pin Image or Multi-Image Slider matching Homepage PromptCard */}
      {isMultiple ? (
        <div
          className={`absolute inset-0 flex ${
            isVerticalSlide ? 'flex-col' : 'flex-row'
          } transition-transform duration-700 ease-in-out will-change-transform`}
          style={{
            transform: isVerticalSlide
              ? `translateY(${translateYPercent}%)`
              : `translateX(-${activeImageIndex * 100}%)`,
          }}
        >
          {displayImages.map((imgUrl, idx) => {
            const img360 = getOptimizedImageUrl(imgUrl, 360);
            const img280 = getOptimizedImageUrl(imgUrl, 280);
            const img420 = getOptimizedImageUrl(imgUrl, 420);
            const isLeadImage = imgUrl === allImages[0];
            return (
              <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden bg-neutral-900">
                <img
                  ref={isLeadImage ? pinImgRef : undefined}
                  src={img360}
                  srcSet={`${img280} 280w, ${img420} 420w`}
                  sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
                  alt={`${pin.imageAlt || pin.title} - photo ${idx + 1}`}
                  loading={isLeadImage ? 'eager' : 'lazy'}
                  decoding={isLeadImage ? 'sync' : 'async'}
                  onLoad={isLeadImage ? (e) => syncPinRatio(e.currentTarget) : undefined}
                  className="w-full h-full object-cover object-top block select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            );
          })}
        </div>
      ) : pin.imageUrl ? (
        <img
          ref={pinImgRef}
          src={getOptimizedImageUrl(pin.imageUrl, 360)}
          srcSet={`${getOptimizedImageUrl(pin.imageUrl, 280)} 280w, ${getOptimizedImageUrl(pin.imageUrl, 420)} 420w`}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
          alt={pin.imageAlt || pin.title}
          loading="eager"
          decoding="sync"
          onLoad={(e) => syncPinRatio(e.currentTarget)}
          className="absolute inset-0 w-full h-full object-cover block"
          referrerPolicy="no-referrer"
        />
      ) : null}

      {/* Multi-Image Slider Controls (Arrows & Dots) */}
      {isMultiple && (
        <>
          {isVerticalSlide ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                }}
                className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-black/90 hover:bg-white text-neutral-900 dark:text-white shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer border border-neutral-200/50"
                title="Previous photo"
                aria-label="Previous photo"
              >
                <ChevronUp className="w-4 h-4 -translate-y-0.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-black/90 hover:bg-white text-neutral-900 dark:text-white shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer border border-neutral-200/50"
                title="Next photo"
                aria-label="Next photo"
              >
                <ChevronDown className="w-4 h-4 translate-y-0.5" />
              </button>

              <div className="absolute right-2.5 inset-y-0 flex flex-col items-center justify-center gap-1.5 z-20 pointer-events-none">
                {allImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`transition-all duration-300 rounded-full ${
                      idx === activeImageIndex
                        ? 'h-3.5 w-1 bg-white shadow-md'
                        : 'w-1 h-1 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-black/90 hover:bg-white text-neutral-900 dark:text-white shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer border border-neutral-200/50"
                title="Previous photo"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-4 h-4 -translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-black/90 hover:bg-white text-neutral-900 dark:text-white shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer border border-neutral-200/50"
                title="Next photo"
                aria-label="Next photo"
              >
                <ChevronRight className="w-4 h-4 translate-x-0.5" />
              </button>

              <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
                {allImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`transition-all duration-300 rounded-full ${
                      idx === activeImageIndex
                        ? 'w-4 h-1.5 bg-white shadow-md'
                        : 'w-1.5 h-1.5 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Dark Vignette Overlay on Hover (desktop only & never on locked cards so image clicks always open prompt view) */}
      <div className="hidden sm:flex absolute inset-0 z-10 bg-black/30 opacity-0 group-hover:opacity-100 flex-col justify-between p-3 pointer-events-none">
        {/* Top Actions */}
        {!(pin.isPremium && !isUnlocked) ? (
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <button
              type="button"
              onClick={(e) => onGenerate(e, pin)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 text-[10px] font-bold shadow-md flex items-center gap-1"
              title="Generate Image with this prompt"
            >
              <Sparkles className="w-3 h-3 text-[#E60023]" />
              <span>Generate</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => onCopy(e, pin)}
                className="p-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-md"
                title="Quick Copy Prompt"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => onToggleBookmark(e, pin)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 ${
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
        ) : (
          <div />
        )}

        {/* Bottom Info: Category & Title */}
        <div className="pointer-events-none">
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

export interface PromptDetailModalProps {
  inlinePost?: PromptPost | null;
  isDirectRoute?: boolean;
}

export const PromptDetailModal = ({ inlinePost = null, isDirectRoute = false }: PromptDetailModalProps = {}) => {
  const {
    selectedPost: contextSelectedPost,
    setSelectedPost,
    copyPromptToClipboard,
    toggleBookmark,
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
    userAccount,
    openAuthModal,
    setIsDirectRouteHost,
    isActivePremiumUser,
    isFullCatalogLoaded,
    ensureFullCatalogLoaded,
  } = useApp();

  const [isDirectClosed, setIsDirectClosed] = useState(false);
  const selectedPost = contextSelectedPost ?? (isDirectRoute && !isDirectClosed ? (inlinePost ?? null) : null);

  const INITIAL_RECOMMENDED_COUNT = 15;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(INITIAL_RECOMMENDED_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [historyStack, setHistoryStack] = useState<PromptPost[]>(() => (selectedPost ? [selectedPost] : []));

  // Gather all images for this prompt strictly for this post
  const allImages = useMemo(() => {
    if (!selectedPost) return [];
    const list: string[] = [];
    if (selectedPost.imageUrl && typeof selectedPost.imageUrl === 'string' && selectedPost.imageUrl.trim()) {
      list.push(selectedPost.imageUrl.trim());
    }

    if (Array.isArray(selectedPost.additionalImages) && selectedPost.additionalImages.length > 0) {
      selectedPost.additionalImages.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }

    return list;
  }, [selectedPost?.id, selectedPost?.imageUrl, selectedPost?.additionalImages]);

  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [prevPostIdForSlider, setPrevPostIdForSlider] = useState<string | null>(selectedPost?.id ?? null);
  const [imageRatios, setImageRatios] = useState<Record<string, string>>({});
  const [loadedMediaMap, setLoadedMediaMap] = useState<Record<string, boolean>>({});
  const [erroredMediaMap, setErroredMediaMap] = useState<Record<string, boolean>>({});
  const mediaImgRefs = useRef<Record<number, HTMLImageElement | null>>({});

  // Reset active slide synchronously during render when switching posts so frame 1 has index 0
  if ((selectedPost?.id ?? null) !== prevPostIdForSlider) {
    setPrevPostIdForSlider(selectedPost?.id ?? null);
    if (currentImageIndex !== 0) {
      setCurrentImageIndex(0);
    }
  }

  const syncMediaRatio = useCallback(
    (postId: string, idx: number, img: HTMLImageElement | null, mediaKey?: string, rawUrl?: string) => {
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      const ratio = `${img.naturalWidth} / ${img.naturalHeight}`;
      const ratioKey = `${postId}::${idx}`;
      setImageRatios((prev) => (prev[ratioKey] === ratio ? prev : { ...prev, [ratioKey]: ratio }));
      if (mediaKey) {
        setLoadedMediaMap((prev) => (prev[mediaKey] ? prev : { ...prev, [mediaKey]: true }));
      }
      if (rawUrl) {
        recordLoadedImageElement(rawUrl, 800, img);
      }
    },
    []
  );

  // Clear DOM ref slots whenever a new prompt is opened
  useEffect(() => {
    mediaImgRefs.current = {};
  }, [selectedPost?.id]);

  // Immediately resolve cached / SSR-preloaded images synchronously after mount or slide change
  useEffect(() => {
    if (!selectedPost) return;
    const img = mediaImgRefs.current[currentImageIndex];
    const currentSrc = allImages[currentImageIndex] || selectedPost.imageUrl;
    const keySrc = getOptimizedImageUrl(currentSrc, 800);
    const mediaKey = `${selectedPost.id}::${currentImageIndex}::${keySrc}`;
    if (img && img.complete && img.naturalWidth > 0) {
      syncMediaRatio(selectedPost.id, currentImageIndex, img, mediaKey, currentSrc);
    }
  }, [selectedPost, currentImageIndex, allImages, syncMediaRatio]);

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : (allImages.length > 0 ? allImages.length - 1 : 0)));
  }, [allImages.length]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  // Touch swipe handling for mobile devices
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Keyboard navigation for image slider
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPost || allImages.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPost, allImages.length, handleNextImage, handlePrevImage]);

  const router = useRouter();
  const postsRef = useRef(posts);
  const historyStackRef = useRef(historyStack);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    historyStackRef.current = historyStack;
  }, [historyStack]);

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
    const cleanTitle = selectedPost.title;
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

  const currentPost = posts.find((p) => p.id === selectedPost?.id) || selectedPost;
  const copiesCount = currentPost?.copiesCount ?? selectedPost?.copiesCount ?? 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollRootEl, setScrollRootEl] = useState<HTMLDivElement | null>(null);
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setScrollRootEl(node);
  }, []);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const exploreCardNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerExploreCardNode = useCallback((pinId: string, el: HTMLDivElement | null) => {
    if (el) {
      exploreCardNodesRef.current.set(pinId, el);
    } else {
      exploreCardNodesRef.current.delete(pinId);
    }
  }, []);

  const closeModal = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDirectClosed(true);
    setSelectedPost(null);
    setHistoryStack([]);
    if (isDirectRoute) {
      setIsDirectRouteHost(false);
    }
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const knownNonSlugRoutes = [
        '/',
        '/dashboard',
        '/create',
        '/prompt-editor',
        '/notifications',
        '/pricing',
        '/checkout',
        '/about',
        '/contact',
        '/privacy-policy',
        '/terms',
        '/disclaimer',
        '/cancellation-refund',
        '/affiliate-disclosure',
        '/ai-policy',
      ];
      if (!isDirectRoute && (knownNonSlugRoutes.includes(path) || path.startsWith('/admin'))) {
        return;
      }
      if (!isDirectRoute && window.history.state?.postId) {
        window.history.back();
      } else {
        startRouteNavigation('/', 'Loading Prompts...');
        router.push('/');
      }
    }
  }, [setSelectedPost, router, isDirectRoute, setIsDirectRouteHost]);

  const handleGoBack = useCallback(() => {
    if (historyStack.length > 1) {
      if (typeof window !== 'undefined' && window.history.state?.isPromptDetail) {
        window.history.back();
        return;
      }
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
        const currentState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
        window.history.replaceState({ ...currentState, postId: prevPost.id, selectedPostId: prevPost.id, isPromptDetail: true }, '', `/${prevSlug}`);
      }
      setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
    } else {
      closeModal();
    }
  }, [historyStack, closeModal, setSelectedPost]);

  const inlinePostRef = useRef(inlinePost);
  inlinePostRef.current = inlinePost;

  // Handle browser / mobile back navigation instantaneously from memory stack without listener churn
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const nonPromptPaths = new Set([
        '/',
        '',
        '/dashboard',
        '/create',
        '/prompt-editor',
        '/notifications',
        '/pricing',
        '/checkout',
        '/about',
        '/contact',
        '/privacy-policy',
        '/terms',
        '/disclaimer',
        '/cancellation-refund',
        '/affiliate-disclosure',
        '/ai-policy',
        '/free-gemini-watermark-remover-online',
      ]);
      if (nonPromptPaths.has(path) || path.startsWith('/admin') || path.startsWith('/cms-login')) {
        setIsDirectClosed(true);
        setSelectedPost(null);
        setHistoryStack([]);
        return;
      }
      if (path.length > 1) {
        const currentPosts = postsRef.current;
        const currentStack = historyStackRef.current;
        const currentInline = inlinePostRef.current;
        const statePostId = event.state?.postId || event.state?.selectedPostId;
        let matched: PromptPost | undefined;

        if (statePostId) {
          matched =
            currentStack.find((p) => p.id === statePostId) ||
            currentPosts.find((p) => p.id === statePostId) ||
            (currentInline && currentInline.id === statePostId ? currentInline : undefined);
        }

        const rawSlug = path.replace(/^\/+/, '').split('/')[0];
        let targetSlug = rawSlug.toLowerCase().trim();
        try {
          targetSlug = decodeURIComponent(rawSlug).toLowerCase().trim();
        } catch {}

        if (!matched) {
          const checkMatch = (p: PromptPost) => {
            if (p.slug && (p.slug.toLowerCase() === targetSlug || slugify(p.slug) === targetSlug)) return true;
            if (p.id && p.id.toLowerCase() === targetSlug) return true;
            if (p.title && (p.title.toLowerCase() === targetSlug || slugify(p.title) === targetSlug)) return true;
            return false;
          };
          matched =
            currentStack.find(checkMatch) ||
            currentPosts.find(checkMatch) ||
            (currentInline && checkMatch(currentInline) ? currentInline : undefined);
        }

        if (matched) {
          setIsDirectClosed(false);
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
                setIsDirectClosed(false);
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

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedPost]);

  // Escape key closes lightbox or goes back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFullImageModal) {
          setShowFullImageModal(false);
        } else if (selectedPost) {
          handleGoBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullImageModal, selectedPost, handleGoBack]);

  const handleGenerateImage = () => {
    if (!selectedPost) return;
    const isUnlocked = isPromptUnlocked(selectedPost.id, selectedPost.isPremium);
    if (!isUnlocked) {
      setSelectedPost(null);
      router.push('/pricing');
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
    showToast('Loaded prompt into Create Studio!');
  };

  const handleDownloadImage = async (e?: React.MouseEvent, overrideUrl?: string) => {
    if (e) e.stopPropagation();
    const downloadUrl = overrideUrl || (allImages[currentImageIndex] || selectedPost?.imageUrl);
    if (!downloadUrl) return;

    setIsDownloadingImage(true);
    try {
      showToast('Downloading photo...');
      const response = await fetch(downloadUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response error');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanSlug = selectedPost?.slug || selectedPost?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'ai-photo-prompt';
      const fileSuffix = allImages.length > 1 ? `-${currentImageIndex + 1}` : '';
      link.download = `${cleanSlug}${fileSuffix}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded successfully!');
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      const fileSuffix = allImages.length > 1 ? `-${currentImageIndex + 1}` : '';
      link.download = `${selectedPost?.slug || 'ai-prompt-photo'}${fileSuffix}.jpg`;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Image downloaded!');
    } finally {
      setIsDownloadingImage(false);
    }
  };

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

    // 2. Calculate relevance score for each remaining post based purely on Tag Overlap (+3 points per matching tag)
    const scored = otherPublished.map((post) => {
      let score = 0;

      // Tag Overlap: +3 points for every matching tag
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          const cleanTag = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
          if (cleanTag && targetTags.has(cleanTag)) {
            score += 3;
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

  const hasMoreLoadedPins = displayedCount < allRecommendedPins.length;
  const hasMorePins = hasMoreLoadedPins || !isFullCatalogLoaded;

  // Infinite scroll loader trigger (10 pins per batch)
  const loadMorePins = useCallback(() => {
    if (isLoadingMore || !hasMorePins) return;
    if (!isFullCatalogLoaded) {
      void ensureFullCatalogLoaded();
    }
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => prev + 10);
      setIsLoadingMore(false);
    }, 250);
  }, [isLoadingMore, hasMorePins, isFullCatalogLoaded, ensureFullCatalogLoaded]);

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

  const [exploreColumnCount, setExploreColumnCount] = useState<number>(2);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqXl = window.matchMedia('(min-width: 1280px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqSm = window.matchMedia('(min-width: 640px)');

    const updateCols = () => {
      if (mqXl.matches) setExploreColumnCount(5);
      else if (mqLg.matches) setExploreColumnCount(4);
      else if (mqSm.matches) setExploreColumnCount(3);
      else setExploreColumnCount(2);
    };

    updateCols();
    mqXl.addEventListener('change', updateCols);
    mqLg.addEventListener('change', updateCols);
    mqSm.addEventListener('change', updateCols);
    return () => {
      mqXl.removeEventListener('change', updateCols);
      mqLg.removeEventListener('change', updateCols);
      mqSm.removeEventListener('change', updateCols);
    };
  }, []);

  const [measuredPinRatios, setMeasuredPinRatios] = useState<Record<string, number>>({});

  const handlePinAspectRatioResolved = useCallback((pinId: string, heightOverWidth: number) => {
    if (!pinId || !isFinite(heightOverWidth) || heightOverWidth <= 0) return;
    setMeasuredPinRatios((prev) => {
      const existing = prev[pinId];
      if (existing && Math.abs(existing - heightOverWidth) < 0.01) return prev;
      return { ...prev, [pinId]: heightOverWidth };
    });
  }, []);

  const exploreMasonryColumns = useMemo(() => {
    const cols: PromptPost[][] = Array.from({ length: exploreColumnCount }, () => []);
    const colHeights = new Array<number>(exploreColumnCount).fill(0);

    visiblePins.forEach((pin) => {
      let shortestCol = 0;
      for (let c = 1; c < exploreColumnCount; c++) {
        if (colHeights[c] < colHeights[shortestCol]) {
          shortestCol = c;
        }
      }
      cols[shortestCol].push(pin);

      let heightFactor = measuredPinRatios[pin.id];
      if (!heightFactor) {
        const ratioStr = getCachedImageAspectRatio(pin.imageUrl) || detectPostAspectRatio(pin);
        const parts = ratioStr.split('/').map((n) => Number(n.trim()));
        heightFactor = parts.length === 2 && parts[0] > 0 && parts[1] > 0 ? parts[1] / parts[0] : 4 / 3;
      }
      colHeights[shortestCol] += Math.min(Math.max(heightFactor, 0.4), 2.5) + 0.08;
    });

    return cols;
  }, [visiblePins, exploreColumnCount, measuredPinRatios]);

  // Viewport IntersectionObserver for "More to explore": caches visible & scrolling cards locally at 0ms
  useEffect(() => {
    if (!selectedPost || visiblePins.length === 0) return;
    const rootEl = scrollRootEl || containerRef.current;
    if (!rootEl || typeof IntersectionObserver === 'undefined') return;

    const pinById = new Map<string, PromptPost>();
    for (const p of visiblePins) {
      pinById.set(p.id, p);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const pinId = target.dataset.explorePinId;
          if (pinId) {
            const pin = pinById.get(pinId);
            if (pin) {
              prepareMoreToExploreCard(pin);
            }
          }
          observer.unobserve(target);
        }
      },
      { root: rootEl, rootMargin: '250px 0px', threshold: 0.01 }
    );

    exploreCardNodesRef.current.forEach((node) => {
      if (node && node.isConnected) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [selectedPost, visiblePins, scrollRootEl, exploreColumnCount]);

  if (!selectedPost) return null;

  const detectedRatio = detectPostAspectRatio(selectedPost);
  const activeSlideRawUrl = allImages[currentImageIndex] || selectedPost.imageUrl;
  const leadSlideRawUrl = allImages[0] || selectedPost.imageUrl;
  const activeImageRatio =
    imageRatios[`${selectedPost.id}::${currentImageIndex}`] ||
    getCachedImageAspectRatio(activeSlideRawUrl) ||
    imageRatios[`${selectedPost.id}::0`] ||
    getCachedImageAspectRatio(leadSlideRawUrl) ||
    detectedRatio;

  const isBookmarked = bookmarkedIds.includes(selectedPost.id);
  const isUnlocked = isPromptUnlocked(selectedPost.id, selectedPost.isPremium);
  const isPromptGated = Boolean(selectedPost.isPremium && !isUnlocked);

  const handleUpgradeToPremium = () => {
    setSelectedPost(null);
    startRouteNavigation('/pricing', 'Loading Pro Plans...');
    router.push('/pricing');
  };

  const handleCopyMasterPrompt = () => {
    if (isPromptGated) {
      handleUpgradeToPremium();
      return;
    }
    copyPromptToClipboard(selectedPost.promptText, selectedPost.id);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleEditPromptInEditor = (text: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_editor_preload', text);
      sessionStorage.setItem('promptcms_studio_tab', 'editor');
    }
    setSelectedPost(null);
    startRouteNavigation('/create', 'Opening AI Prompt Editor...');
    router.push('/create');
    showToast('Prompt loaded into Prompt Editor!');
  };

  const handleGenerateNewVersion = (text: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', `generate a new version of this prompt: ${text}`);
      sessionStorage.setItem('promptcms_studio_tab', 'generator');
    }
    setSelectedPost(null);
    startRouteNavigation('/create', 'Opening Prompt Generator...');
    router.push('/create');
    showToast('Prompt loaded into Prompt Generator!');
  };

  const handleQuickCopyPin = (e: React.MouseEvent, pin: PromptPost) => {
    e.stopPropagation();
    const isPinUnlocked = isPromptUnlocked(pin.id, pin.isPremium);
    if (!isPinUnlocked) {
      handleSelectPin(pin);
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
    prepareMoreToExploreCard(pin);
    setIsDirectClosed(false);
    setCurrentImageIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    const pinSlug = getPromptSlug(pin);
    pushPromptHistoryState(pin.id, pinSlug);
    setSelectedPost(pin);
    setDisplayedCount(INITIAL_RECOMMENDED_COUNT);
  };

  const handleDeconstructImage = () => {
    if (!selectedPost) return;
    if (isPromptGated) {
      handleUpgradeToPremium();
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_tab', 'reverse');
      sessionStorage.setItem('auraprompt_studio_preload', selectedPost.promptText);
      sessionStorage.setItem('promptcms_studio_preload', selectedPost.promptText);
      if (selectedPost.imageUrl) {
        sessionStorage.setItem('promptcms_studio_image_preload', selectedPost.imageUrl);
      }
    }
    setSelectedPost(null);
    startRouteNavigation('/create', 'Opening Image-to-Prompt Studio...');
    router.push('/create');
    showToast('Loaded into Image-to-Prompt (Decode) Studio!');
  };

  return (
    <div
      ref={setContainerNode}
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col"
      id="fullscreen-prompt-view"
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 shadow-sm">
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
          {/* Red Save Button (Strictly accessible after login) */}
          {userAccount?.isLoggedIn ? (
            <button
              onClick={() => toggleBookmark(selectedPost.id)}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm transition-all ${
                isBookmarked
                  ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                  : 'bg-[#E60023] hover:bg-[#ad081b] text-white shadow-[#E60023]/20'
              }`}
              title={isBookmarked ? 'Saved to collection' : 'Save prompt'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('Sign in to save this prompt to your private collection.')}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E60023] hover:bg-[#ad081b] text-white shadow-sm transition-all"
              title="Sign in to save prompt"
            >
              <Bookmark className="w-4 h-4" />
              <span>Sign in to Save</span>
            </button>
          )}

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
        {/* Master Prompt Card */}
        <section
          key={selectedPost.id}
          className="bg-white dark:bg-neutral-900 rounded-[28px] sm:rounded-[36px] shadow-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left Column: Edge-to-Edge Natural Proportions Photo Showcase */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              className="lg:col-span-7 bg-white dark:bg-neutral-900 flex flex-col justify-start items-start p-0 relative select-none overflow-hidden"
            >
              {/* Affiliate Product Hotspot Badges - Left Side Vertically over image */}
              {selectedPost.affiliateProducts && selectedPost.affiliateProducts.length > 0 && (
                <div className={`absolute ${selectedPost.isPremium ? 'top-16' : 'top-4'} left-4 z-30 flex flex-col gap-2 pointer-events-auto`}>
                  {selectedPost.affiliateProducts.map((item) => {
                    const getAffiliateIcon = (type: string) => {
                      switch (type) {
                        case 'tshirt':
                        case 'saree':
                        case 'dress':
                        case 'jacket':
                          return <Shirt className="w-4 h-4 text-white" />;
                        case 'pant':
                          return <Scissors className="w-4 h-4 text-white" />;
                        case 'glasses':
                          return <Glasses className="w-4 h-4 text-white" />;
                        case 'shoes':
                          return <Footprints className="w-4 h-4 text-white" />;
                        case 'hat':
                          return <Tag className="w-4 h-4 text-white" />;
                        default:
                          return <ShoppingBag className="w-4 h-4 text-white" />;
                      }
                    };
                    return (
                      <a
                        key={item.id}
                        href={item.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        onClick={(e) => e.stopPropagation()}
                        title={`Shop ${item.label} on Amazon`}
                        className="w-10 h-10 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white flex items-center justify-center backdrop-blur-md transition-transform hover:scale-110 shadow-2xl border border-white/30 cursor-pointer"
                      >
                        {getAffiliateIcon(item.type)}
                      </a>
                    );
                  })}
                </div>
              )}

              {allImages.length > 0 ? (
                <div
                  onContextMenu={(e) => e.preventDefault()}
                  onTouchStart={allImages.length > 1 ? handleTouchStart : undefined}
                  onTouchEnd={allImages.length > 1 ? handleTouchEnd : undefined}
                  className="relative w-full overflow-hidden flex flex-col items-center justify-center select-none group/slider"
                >
                  {allImages.length > 1 ? (
                    /* Multi-Image Carousel Slider: Matches active slide natural aspect ratio with zero extra vertical spacing */
                    <div
                      style={{
                        aspectRatio: activeImageRatio,
                      }}
                      className="relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950 select-none group/slider"
                    >
                      {/* Smooth Horizontal Sliding Track */}
                      <div
                        className="absolute inset-0 flex transition-transform duration-500 ease-out will-change-transform"
                        style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                      >
                        {allImages.map((imgUrl, idx) => {
                          const slide800 = getOptimizedImageUrl(imgUrl, 800);
                          const slidePreviewUrl = getOptimizedImageUrl(imgUrl, 360);
                          const slideKey = `${selectedPost.id}::${idx}::${slide800}`;
                          const isSlideLoaded =
                            Boolean(loadedMediaMap[slideKey]) || isImageUrlCachedInMemory(imgUrl, 800);
                          const isSlidePreviewLoaded = isImageUrlCachedInMemory(imgUrl, 360);
                          const isSlideErrored = Boolean(erroredMediaMap[slideKey]);
                          const hasDifferentSlidePreview = Boolean(slidePreviewUrl && slidePreviewUrl !== slide800);
                          return (
                            <div
                              key={idx}
                              className="w-full h-full shrink-0 relative overflow-hidden bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center"
                            >
                              {!isSlideLoaded && !isSlidePreviewLoaded && !isSlideErrored && (
                                <div
                                  aria-hidden="true"
                                  className="absolute inset-0 z-10 pointer-events-none bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex flex-col items-center justify-center gap-2.5"
                                >
                                  <div className="relative w-12 h-12 rounded-2xl bg-neutral-300/80 dark:bg-neutral-700/80 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
                                  </div>
                                </div>
                              )}
                              {!isSlideLoaded && isSlidePreviewLoaded && hasDifferentSlidePreview && (
                                <img
                                  src={slidePreviewUrl}
                                  alt=""
                                  aria-hidden="true"
                                  loading="eager"
                                  decoding="sync"
                                  className="absolute inset-0 w-full h-full object-cover object-top block select-none pointer-events-none z-[1]"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <img
                                ref={(el) => {
                                  mediaImgRefs.current[idx] = el;
                                }}
                                src={slide800}
                                alt={`${selectedPost.imageAlt || selectedPost.title} - photo ${idx + 1}`}
                                className="relative z-[2] w-full h-full object-cover object-top block select-none pointer-events-none"
                                referrerPolicy="no-referrer"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                fetchPriority={idx === 0 ? 'high' : 'auto'}
                                decoding="sync"
                                onLoad={(e) => syncMediaRatio(selectedPost.id, idx, e.currentTarget, slideKey, imgUrl)}
                                onError={() =>
                                  setErroredMediaMap((prev) => (prev[slideKey] ? prev : { ...prev, [slideKey]: true }))
                                }
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Multiple Photos Badge Indicator (e.g. 1 / 4) */}
                      <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold shadow-lg border border-white/10 flex items-center gap-1.5 pointer-events-none">
                        <Layers className="w-3.5 h-3.5 text-white/80" />
                        <span>{currentImageIndex + 1} / {allImages.length}</span>
                      </div>

                      {/* Left Navigation Chevron Arrow */}
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 dark:bg-neutral-900/90 hover:bg-white text-neutral-900 dark:text-white shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 group-hover/slider:opacity-100 border border-neutral-200/50 dark:border-neutral-700/50"
                        aria-label="Previous slide"
                        title="Previous photo (Left arrow)"
                      >
                        <ChevronLeft className="w-5 h-5 -translate-x-0.5" />
                      </button>

                      {/* Right Navigation Chevron Arrow */}
                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 dark:bg-neutral-900/90 hover:bg-white text-neutral-900 dark:text-white shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 group-hover/slider:opacity-100 border border-neutral-200/50 dark:border-neutral-700/50"
                        aria-label="Next slide"
                        title="Next photo (Right arrow)"
                      >
                        <ChevronRight className="w-5 h-5 translate-x-0.5" />
                      </button>

                      {/* Pagination Indicator Dots */}
                      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(idx);
                            }}
                            className={`pointer-events-auto transition-all duration-300 rounded-full cursor-pointer ${
                              idx === currentImageIndex
                                ? 'w-5 h-2 bg-white shadow-lg'
                                : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                            title={`Photo ${idx + 1}`}
                          />
                        ))}
                      </div>

                      {/* Action Icons Overlay: Decode + Download + Enlarge */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeconstructImage();
                          }}
                          data-action="decode-prompt"
                          data-nav-href={isPromptGated ? '/pricing' : '/create'}
                          data-nav-label={isPromptGated ? 'Loading Pro Plans...' : 'Opening Image-to-Prompt Studio...'}
                          className="px-3 py-2 rounded-full bg-black/75 hover:bg-[#E60023] text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer border border-white/10"
                          title="Decode Image & Prompt in AI Studio"
                          aria-label="Decode Image & Prompt in AI Studio"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Decode</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadImage(e, allImages[currentImageIndex])}
                          disabled={isDownloadingImage}
                          className="p-2.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-white/10"
                          title="Download Photo"
                          aria-label="Download Photo"
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
                          className="p-2.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-white/10"
                          title="View Full Resolution Image (Uncropped)"
                          aria-label="Enlarge Image"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Single Image Display: Renders pre-cached 360w layer at 0ms while 800w seamlessly takes natural full height with zero extra spacing */
                    (() => {
                      const rawSingleUrl = allImages[0] || selectedPost.imageUrl;
                      const singleUrl = getOptimizedImageUrl(rawSingleUrl, 800);
                      const singlePreviewUrl = getOptimizedImageUrl(rawSingleUrl, 360);
                      const singleKey = `${selectedPost.id}::0::${singleUrl}`;
                      const previewKey = `${selectedPost.id}::0::preview::${singlePreviewUrl}`;
                      const isSingleLoaded =
                        Boolean(loadedMediaMap[singleKey]) || isImageUrlCachedInMemory(rawSingleUrl, 800);
                      const isPreviewLoaded =
                        Boolean(loadedMediaMap[previewKey]) || isImageUrlCachedInMemory(rawSingleUrl, 360);
                      const isSingleErrored = Boolean(erroredMediaMap[singleKey]);
                      const hasDifferentPreview = Boolean(singlePreviewUrl && singlePreviewUrl !== singleUrl);
                      const exactCachedRatio =
                        imageRatios[`${selectedPost.id}::0`] || getCachedImageAspectRatio(rawSingleUrl);
                      const containerStyle = exactCachedRatio
                        ? { aspectRatio: exactCachedRatio }
                        : isSingleLoaded
                          ? undefined
                          : { aspectRatio: activeImageRatio };
                      return (
                        <div
                          style={containerStyle}
                          className="relative w-full overflow-hidden bg-white dark:bg-neutral-900 select-none group/single"
                        >
                          {!isSingleLoaded && !isPreviewLoaded && !isSingleErrored && (
                            <div
                              aria-hidden="true"
                              className="absolute inset-0 z-0 pointer-events-none bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex flex-col items-center justify-center gap-2.5"
                            >
                              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent animate-shimmer" />
                              <div className="relative w-12 h-12 rounded-2xl bg-neutral-300/80 dark:bg-neutral-700/80 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
                              </div>
                            </div>
                          )}
                          {!isSingleLoaded && hasDifferentPreview && (
                            <img
                              src={singlePreviewUrl}
                              alt=""
                              aria-hidden="true"
                              loading="eager"
                              decoding="sync"
                              onLoad={(e) => syncMediaRatio(selectedPost.id, 0, e.currentTarget, previewKey, rawSingleUrl)}
                              className="absolute inset-0 w-full h-full object-cover object-top block select-none pointer-events-none z-[1]"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <img
                            ref={(el) => {
                              mediaImgRefs.current[0] = el;
                            }}
                            src={singleUrl}
                            alt={selectedPost.imageAlt || selectedPost.title}
                            loading="eager"
                            fetchPriority="high"
                            decoding="sync"
                            onLoad={(e) => syncMediaRatio(selectedPost.id, 0, e.currentTarget, singleKey, rawSingleUrl)}
                            onError={() =>
                              setErroredMediaMap((prev) => (prev[singleKey] ? prev : { ...prev, [singleKey]: true }))
                            }
                            className={
                              isSingleLoaded
                                ? exactCachedRatio
                                  ? 'w-full h-full object-cover object-top block select-none pointer-events-none'
                                  : 'w-full h-auto block select-none pointer-events-none'
                                : 'relative z-[2] w-full h-full object-cover object-top block select-none pointer-events-none'
                            }
                            referrerPolicy="no-referrer"
                          />

                          {/* Action Icons Overlay: Decode + Download + Enlarge */}
                          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeconstructImage();
                              }}
                              data-action="decode-prompt"
                              data-nav-href={isPromptGated ? '/pricing' : '/create'}
                              data-nav-label={isPromptGated ? 'Loading Pro Plans...' : 'Opening Image-to-Prompt Studio...'}
                              className="px-3 py-2 rounded-full bg-black/75 hover:bg-[#E60023] text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer border border-white/10"
                              title="Decode Image & Prompt in AI Studio"
                              aria-label="Decode Image & Prompt in AI Studio"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Decode</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadImage(e, allImages[0] || selectedPost.imageUrl)}
                              disabled={isDownloadingImage}
                              className="p-2.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-white/10"
                              title="Download Photo"
                              aria-label="Download Photo"
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
                              className="p-2.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-white/10"
                              title="View Full Resolution Image"
                              aria-label="Enlarge Image"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* Thumbnail Row Strip when multiple images are present */}
                  {allImages.length > 1 && (
                    <div className="w-full px-4 py-3 bg-neutral-900/95 border-t border-neutral-800/80 flex items-center gap-2.5 overflow-x-auto scrollbar-none">
                      {allImages.map((thumbUrl, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(tIdx);
                          }}
                          className={`relative shrink-0 w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                            tIdx === currentImageIndex
                              ? 'border-[#E60023] ring-2 ring-red-500/40 scale-105 shadow-md'
                              : 'border-transparent opacity-60 hover:opacity-100 hover:scale-102'
                          }`}
                          title={`Photo ${tIdx + 1}`}
                        >
                          <img
                            src={getOptimizedImageUrl(thumbUrl, 160)}
                            alt={`Thumbnail ${tIdx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                    </div>
                  )}
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
                      <span
                        className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0"
                        title="Premium Prompt"
                        aria-label="Premium Prompt"
                      >
                        <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60">
                      {selectedPost.category}
                    </span>
                  </div>

                  {/* Action Icons: Preferred AI, Copy */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {selectedPost.preferredAi && (
                      <a
                        href={selectedPost.preferredAi === 'ChatGPT' ? 'https://chatgpt.com' : 'https://gemini.google.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open in ${selectedPost.preferredAi}`}
                        aria-label={`Open in ${selectedPost.preferredAi}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-700 shadow-xs"
                      >
                        <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 lowercase tracking-tight">preferred in</span>
                        {selectedPost.preferredAi === 'ChatGPT' ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.9807 5.9807 0 0 0 .5157 4.9108 6.0512 6.0512 0 0 0 6.5098 2.9 6.0512 6.0512 0 0 0 4.2875 1.7856 5.9847 5.9847 0 0 0 3.9977-2.9 6.0462 6.0462 0 0 0-.7427-7.0966zm-7.979 9.3872a4.3418 4.3418 0 0 1-2.9105-1.1042l.1423-.083 3.6336-2.0984a1.0558 1.0558 0 0 0 .5286-.9106V9.1171l1.5307.8841a.3496.3496 0 0 1 .1743.3032v4.845a4.3544 4.3544 0 0 1-3.0991 4.148zm-8.4975-2.9155a4.3418 4.3418 0 0 1-.5778-3.0782l.1423.082 3.6336 2.0984a1.0588 1.0588 0 0 0 1.0572 0l4.208-2.4295v1.7682a.3546.3546 0 0 1-.1794.3073l-4.195 2.4225a4.3594 4.3594 0 0 1-5.099-.1707zM4.9085 7.6432a4.3418 4.3418 0 0 1 2.4573-2.0162v4.1969a1.0558 1.0558 0 0 0 .5286.9106l4.208 2.4295-1.5307.8841a.3496.3496 0 0 1-.3486 0L6.027 12.6247a4.3594 4.3594 0 0 1-1.1185-4.9815zm13.1492 4.1969-4.208-2.4295 1.5307-.8841a.3496.3496 0 0 1 .3486 0l4.195 2.4225a4.3594 4.3594 0 0 1-.6507 7.854v-4.1969a1.0588 1.0588 0 0 0-.5286-.906zm-8.156-4.5976 1.5307-.8841a.3546.3546 0 0 1 .3486 0l4.195 2.4225a4.3594 4.3594 0 0 1 1.767 3.5358V8.349a1.0558 1.0558 0 0 0-.5286-.9106L8.0336 5.0089v4.2341zM6.92 6.9455a4.3594 4.3594 0 0 1 5.9221-1.5794l-.1423.082L9.0662 7.5465a1.0588 1.0588 0 0 0-.5286.906v4.8501L7.0069 12.418a.3496.3496 0 0 1-.1743-.3032V7.2699z"/>
                            </svg>
                            <span>ChatGPT</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-extrabold">
                            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24Z"/>
                            </svg>
                            <span>Gemini</span>
                          </span>
                        )}
                      </a>
                    )}

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={handleCopyMasterPrompt}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-xs border ${
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
                  </div>
                </div>

                {/* Pin Title */}
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white leading-tight tracking-tight">
                    {selectedPost.title}
                  </h1>
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
                    <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 text-neutral-100 p-4 sm:p-6 lg:p-7 border border-amber-500/40 shadow-xl overflow-hidden text-center flex flex-col items-center justify-center w-full">
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
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-md shrink-0">
                          <Lock className="w-5 h-5" />
                        </div>

                        <div className="space-y-1.5 text-center px-1">
                          <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-2 flex-wrap">
                            <span>Premium Prompt Locked</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                              PRO
                            </span>
                          </h3>
                          <p className="text-xs sm:text-sm text-neutral-300 max-w-sm mx-auto leading-relaxed font-sans">
                            Subscribe to Premium to reveal this prompt text, copy instantly, and unlock all PRO prompts.
                          </p>
                        </div>

                        <div className="flex items-center justify-center w-full pt-1">
                          <button
                            type="button"
                            onClick={handleUpgradeToPremium}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95 font-sans cursor-pointer text-center"
                          >
                            <Crown className="w-4 h-4 fill-black shrink-0" />
                            <span>Upgrade to Premium at just 99/Year</span>
                            <ArrowRight className="w-4 h-4 shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl bg-neutral-950 text-neutral-100 p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed border border-neutral-800 shadow-inner group">
                      <p
                        onCopy={(e) => {
                          if (!isActivePremiumUser) {
                            e.preventDefault();
                            const selected = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
                            const target = selected && selected.trim().length > 0 ? selected : selectedPost.promptText;
                            e.clipboardData?.setData('text/plain', formatPromptForClipboard(target, false));
                          }
                        }}
                        className="whitespace-pre-wrap select-all selection:bg-red-600 selection:text-white max-h-[220px] overflow-y-auto"
                      >
                        {selectedPost.promptText}
                      </p>

                      <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-neutral-400 font-sans">
                          {selectedPost.promptText.length} chars
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditPromptInEditor(selectedPost.promptText)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-all border border-neutral-700"
                            title="Edit prompt in Prompt Editor"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-red-500" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGenerateNewVersion(selectedPost.promptText)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-all border border-neutral-700"
                            title="Generate new version in Prompt Generator"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Generate new version</span>
                          </button>

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

                  <Link
                    href="/free-gemini-watermark-remover-online"
                    onClick={() => setSelectedPost(null)}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 text-white font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.99]"
                  >
                    <Wand2 className="w-4 h-4 shrink-0" />
                    <span>Try Free Gemini Watermark Remover Tool</span>
                  </Link>
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

        {/* "More to explore" / "More Prompts" Masonry Image Grid */}
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

          {/* Responsive Visual Pins Deterministic Masonry Columns (0 CLS & 0 transitions) */}
          <div className="flex items-start gap-3 sm:gap-4 w-full" id="more-explore-masonry">
            {exploreMasonryColumns.map((colPins, colIdx) => (
              <div key={colIdx} className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">
                {colPins.map((pin) => (
                  <div
                    key={pin.id}
                    ref={(el) => registerExploreCardNode(pin.id, el)}
                    data-explore-pin-id={pin.id}
                    className="w-full"
                  >
                    <RecommendedPinCard
                      pin={pin}
                      isPinBookmarked={bookmarkedIds.includes(pin.id)}
                      isCopied={copiedPinId === pin.id}
                      isUnlocked={isPromptUnlocked(pin.id, pin.isPremium)}
                      isProUser={isProUser}
                      onSelect={handleSelectPin}
                      onAspectRatioResolved={handlePinAspectRatioResolved}
                      onGenerate={(e, p) => {
                        e.stopPropagation();
                        const isPinUnlocked = isPromptUnlocked(p.id, p.isPremium);
                        if (!isPinUnlocked) {
                          handleSelectPin(p);
                          return;
                        }
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('auraprompt_studio_preload', p.promptText);
                          sessionStorage.setItem('promptcms_studio_preload', p.promptText);
                          if (p.imageUrl) {
                            sessionStorage.setItem('promptcms_studio_image_preload', p.imageUrl);
                          }
                        }
                        setSelectedPost(null);
                        startRouteNavigation('/create', 'Opening AI Studio...');
                        router.push('/create');
                        showToast('Loaded prompt into Create Studio!');
                      }}
                      onCopy={(e, p) => handleQuickCopyPin(e, p)}
                      onToggleBookmark={(e, p) => {
                        e.stopPropagation();
                        if (!userAccount?.isLoggedIn) {
                          openAuthModal('Please sign in or create an account to save prompts.');
                          return;
                        }
                        toggleBookmark(p.id);
                      }}
                    />
                  </div>
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

      {/* Full-Screen Image Lightbox Modal with Multi-Image Slider */}
      {showFullImageModal && (allImages[currentImageIndex] || selectedPost.imageUrl) && (
        <div
          onClick={() => setShowFullImageModal(false)}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={allImages.length > 1 ? handleTouchStart : undefined}
          onTouchEnd={allImages.length > 1 ? handleTouchEnd : undefined}
          className="fixed inset-0 z-[75] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in select-none"
        >
          {/* Lightbox Top Left: Counter */}
          {allImages.length > 1 && (
            <div className="absolute top-5 left-5 z-20">
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                {currentImageIndex + 1} / {allImages.length}
              </span>
            </div>
          )}

          {/* Lightbox Controls: Download + Close */}
          <div className="absolute top-5 right-5 flex items-center gap-2 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(e, allImages[currentImageIndex]);
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              title="Download Current Photo"
              aria-label="Download Photo"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowFullImageModal(false)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              title="Close Lightbox"
              aria-label="Close Lightbox"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Left Arrow in Lightbox */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevImage(e);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl"
              title="Previous Photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Right Arrow in Lightbox */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage(e);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl"
              title="Next Photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center select-none"
          >
            <img
              key={allImages[currentImageIndex] || selectedPost.imageUrl}
              src={allImages[currentImageIndex] || selectedPost.imageUrl}
              alt={`${selectedPost.imageAlt || selectedPost.title} - photo ${currentImageIndex + 1}`}
              draggable={false}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl select-none pointer-events-auto transition-all duration-200"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Dots in Lightbox */}
          {allImages.length > 1 && (
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`pointer-events-auto transition-all duration-300 rounded-full cursor-pointer ${
                    idx === currentImageIndex
                      ? 'w-5 h-2 bg-white shadow-lg'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
