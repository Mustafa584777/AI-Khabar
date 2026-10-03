'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PromptPost } from '@/types/prompt';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';
import { Sparkles, Bookmark, Crown, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
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

  // Auto-slide images automatically when multiple images exist and not hovered
  useEffect(() => {
    if (!isMultiple || isHovered) return;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    }, 3500);
    return () => clearInterval(timer);
  }, [isMultiple, allImages.length, isHovered]);

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
    if (typeof window !== 'undefined' && isMultiple) {
      try {
        sessionStorage.setItem('auraprompt_active_slider_images', JSON.stringify(allImages));
        sessionStorage.setItem(`auraprompt_slider_${post.id}`, JSON.stringify(allImages));
        sessionStorage.setItem(`auraprompt_slider_index_${post.id}`, String(activeImageIndex));
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

        {inView && optimizedImgUrl ? (
          <Image
            src={optimizedImgUrl}
            alt={post.imageAlt || post.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            draggable={false}
            priority={priority}
            onLoad={() => setImageLoaded(true)}
            className={`object-cover group-hover:scale-105 transition-all duration-500 ease-out select-none pointer-events-none relative z-1 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            referrerPolicy="no-referrer"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            unoptimized={Boolean(
              (typeof currentImg === 'string' && (currentImg.startsWith('data:') || currentImg.startsWith('blob:'))) ||
              (typeof optimizedImgUrl === 'string' && (optimizedImgUrl.startsWith('data:') || optimizedImgUrl.startsWith('blob:')))
            )}
          />
        ) : !post.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-neutral-800 to-neutral-900 text-neutral-400">
            <Sparkles className="w-8 h-8 opacity-40" />
          </div>
        ) : null}

        {/* Dark Semi-Transparent Overlay with White Popup Action Buttons */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto flex items-center justify-center gap-3.5 z-10">
          {userAccount?.isLoggedIn && (
            <button
              type="button"
              onClick={handleBookmark}
              className={`w-12 h-12 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl flex items-center justify-center transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95 ${
                isBookmarked ? 'ring-2 ring-[#E60023] text-[#E60023]' : 'text-neutral-900'
              }`}
              title={isBookmarked ? 'Saved (Click to remove)' : 'Save prompt'}
              aria-label="Save prompt"
            >
              {isBookmarked ? (
                <Bookmark className="w-5 h-5 fill-[#E60023] text-[#E60023]" />
              ) : (
                <Bookmark className="w-5 h-5 text-neutral-800" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDeconstructImagePrompt}
            data-action="decode-prompt"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95 text-xs font-bold"
            title="Decode"
            aria-label="Decode"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Decode</span>
          </button>
        </div>

        {/* Multi-Image Pinterest Slider Controls on Card */}
        {isMultiple && (
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
      </a>
    </article>
  );
};
