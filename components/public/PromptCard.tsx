'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PromptPost } from '@/types/prompt';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';
import { Sparkles, Bookmark, Crown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Layers, Copy } from 'lucide-react';
import { getPromptSlug, getOptimizedImageUrl, detectPostAspectRatio, getPromptMetaDescription } from '@/lib/utils';

export const PromptCard = ({ post, priority = false }: { post: PromptPost; priority?: boolean }) => {
  const {
    setSelectedPost,
    toggleBookmark,
    bookmarkedIds,
    showToast,
    isPromptUnlocked,
    isProUser,
    userAccount,
    openAuthModal,
    copyPromptToClipboard,
  } = useApp();

  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [inView, setInView] = useState(() => priority || typeof window === 'undefined' || !('IntersectionObserver' in window));
  const cardRef = useRef<HTMLElement>(null);

  // All images for this card (Main image + additionalImages)
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (post.imageUrl && typeof post.imageUrl === 'string') {
      list.push(post.imageUrl.trim());
    }
    if (Array.isArray(post.additionalImages)) {
      post.additionalImages.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    return list;
  }, [post.imageUrl, post.additionalImages]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isMultiple = allImages.length > 1;

  // Selected prompt cards (~40%) slide vertically top-to-bottom, rest slide horizontally
  const isVerticalSlide = React.useMemo(() => {
    if (!post.id) return false;
    let hash = 0;
    for (let i = 0; i < post.id.length; i++) {
      hash = (hash << 5) - hash + post.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 5 < 2; // 40% vertical top-to-bottom
  }, [post.id]);

  // In vertical top-to-bottom mode, render reverse order in DOM so that +100% translation steps slide from top to bottom
  const displayImages = React.useMemo(() => {
    if (isVerticalSlide) {
      return [...allImages].reverse();
    }
    return allImages;
  }, [allImages, isVerticalSlide]);

  const translateYPercent = React.useMemo(() => {
    if (!isVerticalSlide || allImages.length === 0) return 0;
    return -((allImages.length - 1 - activeImageIndex) * 100);
  }, [isVerticalSlide, allImages.length, activeImageIndex]);

  // Individual natural duration: 2.6s, 2.7s, 2.8s, 3.0s (2600ms, 2700ms, 2800ms, 3000ms)
  const slideInterval = React.useMemo(() => {
    const durations = [2600, 2700, 2800, 3000];
    if (!post.id) {
      return durations[Math.floor(Math.random() * durations.length)];
    }
    let hash = 0;
    for (let i = 0; i < post.id.length; i++) {
      hash = (hash << 5) - hash + post.id.charCodeAt(i);
      hash |= 0;
    }
    return durations[Math.abs(hash) % durations.length];
  }, [post.id]);

  // Auto-slide images infinitely when multiple images exist with natural asynchronous stagger
  useEffect(() => {
    if (!isMultiple || !inView) return;

    // Stagger start time slightly so cards with the same interval don't slide simultaneously
    const charCode = post.id ? post.id.charCodeAt(post.id.length - 1) : 0;
    const initialOffset = (charCode % 8) * 200; // 0ms to 1400ms stagger

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
  }, [isMultiple, inView, allImages.length, slideInterval, post.id]);

  const isBookmarked = bookmarkedIds.includes(post.id);
  const isUnlocked = isPromptUnlocked(post.id, post.isPremium);
  const promptSlug = getPromptSlug(post);
  const detectedRatio = detectPostAspectRatio(post);
  const currentImg = isMultiple ? (allImages[activeImageIndex] || post.imageUrl) : post.imageUrl;
  const optimizedImgUrl = getOptimizedImageUrl(currentImg, 600);

  // Viewport IntersectionObserver: strictly loads images only when entering or near viewport
  useEffect(() => {
    if (inView) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px 0px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('auraprompt_active_slider_images');
        sessionStorage.removeItem('auraprompt_active_slider_index');
      } catch {}
    }
    setSelectedPost(post);
    if (typeof window !== 'undefined') {
      window.history.pushState({ postId: post.id }, '', `/${promptSlug}`);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let isLoggedIn = userAccount?.isLoggedIn;
    if (!isLoggedIn && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('promptcms_user_account');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.isLoggedIn) isLoggedIn = true;
        }
      } catch (err) {}
    }
    if (!isLoggedIn) {
      openAuthModal('Please sign in or create an account to save prompts to your collection.');
      return;
    }
    toggleBookmark(post.id);
  };

  const handleDeconstructImagePrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      if (post.imageUrl) {
        sessionStorage.setItem('promptcms_studio_image_preload', post.imageUrl);
        sessionStorage.setItem('auraprompt_studio_image_preload', post.imageUrl);
      }
      sessionStorage.setItem('promptcms_studio_tab', 'reverse');
    }
    router.push('/create');
    showToast('Loaded prompt image into Image-to-Prompt tool!');
  };

  return (
    <article
      ref={cardRef}
      itemScope
      itemType="https://schema.org/CreativeWork"
      className="group relative rounded-[20px] sm:rounded-[24px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 select-none w-full"
      id={`prompt-pin-${post.id}`}
      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="sr-only" itemProp="name">{post.title}</h2>
      <p className="sr-only" itemProp="description">{getPromptMetaDescription(post)}</p>
      <a
        href={`/${promptSlug}`}
        onClick={handleCardClick}
        style={{ aspectRatio: detectedRatio }}
        aria-label={`${post.title} - ${post.category} AI Photo Prompt`}
        className="block relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 focus:outline-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="sr-only">{post.title} - {post.category} copy paste prompt</span>
        {/* Premium Badge */}
        {post.isPremium && (
          <div className={`absolute top-2.5 left-2.5 z-20 flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-md shadow-xl pointer-events-none ${
            isUnlocked && !isProUser
              ? 'bg-emerald-950/85 border border-emerald-400/60 text-emerald-300'
              : 'bg-black/85 border border-amber-400/60 text-amber-300'
          }`}>
            <Crown className={`w-3.5 h-3.5 ${isUnlocked && !isProUser ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'}`} />
          </div>
        )}

        {/* Full-Height Shimmer Skeleton Placeholder removed */}

        {inView && isMultiple ? (
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
            {displayImages.map((imgUrl, idx) => (
              <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden bg-neutral-900">
                <img
                  src={getOptimizedImageUrl(imgUrl, 500)}
                  alt={`${post.imageAlt || post.title} - photo ${idx + 1}`}
                  draggable={false}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                  loading={priority && idx === 0 ? 'eager' : 'lazy'}
                  fetchPriority={priority && idx === 0 ? 'high' : 'auto'}
                  decoding={priority && idx === 0 ? 'sync' : 'async'}
                  width={450}
                  height={600}
                />
              </div>
            ))}
          </div>
        ) : inView && post.imageUrl ? (
          <img
            src={getOptimizedImageUrl(post.imageUrl, 500)}
            alt={post.imageAlt || post.title}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out select-none pointer-events-none"
            referrerPolicy="no-referrer"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            width={450}
            height={600}
          />
        ) : !post.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-neutral-800 to-neutral-900 text-neutral-400">
            <Sparkles className="w-8 h-8 opacity-40" />
          </div>
        ) : null}

        {/* Dark Semi-Transparent Overlay with White Popup Action Buttons */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto flex items-center justify-center gap-2.5 z-10 px-2">
          {userAccount?.isLoggedIn && (
            <button
              type="button"
              onClick={handleBookmark}
              className={`w-10 h-10 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl flex items-center justify-center transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95 ${
                isBookmarked ? 'ring-2 ring-[#E60023] text-[#E60023]' : 'text-neutral-900'
              }`}
              title={isBookmarked ? 'Saved (Click to remove)' : 'Save prompt'}
              aria-label="Save prompt"
            >
              {isBookmarked ? (
                <Bookmark className="w-4 h-4 fill-[#E60023] text-[#E60023]" />
              ) : (
                <Bookmark className="w-4 h-4 text-neutral-800" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyPromptToClipboard(post.promptText, post.id);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95 text-xs font-bold"
            title="Copy prompt"
            aria-label="Copy prompt"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-800" />
            <span>Copy</span>
          </button>

          <button
            type="button"
            onClick={handleDeconstructImagePrompt}
            data-action="decode-prompt"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95 text-xs font-bold"
            title="Decode"
            aria-label="Decode"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Decode</span>
          </button>
        </div>

        {/* Multi-Image Pinterest Slider Controls on Card */}
        {isMultiple && (
          <>
            {isVerticalSlide ? (
              <>
                {/* Up Chevron Arrow on card hover (Previous photo) */}
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

                {/* Down Chevron Arrow on card hover (Next photo) */}
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

                {/* Vertical Dot Indicators on right edge */}
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
                {/* Left Chevron Arrow on card hover */}
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

                {/* Right Chevron Arrow on card hover */}
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

                {/* Pinterest Dot Indicators at bottom */}
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
      </a>
    </article>
  );
};
