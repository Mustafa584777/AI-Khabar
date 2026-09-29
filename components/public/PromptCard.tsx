'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PromptPost } from '@/types/prompt';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';
import { Sparkles, Bookmark, Crown } from 'lucide-react';
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

  const isBookmarked = bookmarkedIds.includes(post.id);
  const isUnlocked = isPromptUnlocked(post.id, post.isPremium);
  const promptSlug = getPromptSlug(post);
  const detectedRatio = detectPostAspectRatio(post);
  
  // Collect all slides: Main featured image + additional extra images
  const allImages = React.useMemo(() => {
    const list = [post.imageUrl, ...(post.additionalImages || [])].filter(
      (url): url is string => Boolean(url && typeof url === 'string' && url.trim())
    );
    return Array.from(new Set(list));
  }, [post.imageUrl, post.additionalImages]);
  const isSlider = allImages.length > 1;

  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset slide index when post changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [post.id]);

  // Auto-slide every 2 seconds until the last image is reached (not infinite)
  useEffect(() => {
    if (!isSlider || !inView) return;
    if (currentSlide >= allImages.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev < allImages.length - 1 ? prev + 1 : prev));
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSlider, inView, currentSlide, allImages.length]);

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

        {inView && allImages.length > 0 ? (
          <div className="relative w-full h-full overflow-hidden">
            {/* Horizontal Carousel Track */}
            <div
              className="flex w-full h-full transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {allImages.map((imgUrl, idx) => {
                const optUrl = getOptimizedImageUrl(imgUrl, 600);
                const altText =
                  idx === 0
                    ? post.imageAlt || post.title
                    : post.additionalImageAlts?.[idx - 1] || `${post.imageAlt || post.title} - Slide ${idx + 1}`;

                return (
                  <div
                    key={imgUrl || idx}
                    className="relative w-full h-full shrink-0 grow-0 basis-full overflow-hidden select-none"
                  >
                    <Image
                      src={optUrl}
                      alt={altText}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      draggable={false}
                      priority={priority && idx === 0}
                      onLoad={() => idx === 0 && setImageLoaded(true)}
                      className={`object-cover group-hover:scale-105 transition-all duration-500 ease-out select-none pointer-events-none relative z-1 ${
                        idx === 0
                          ? imageLoaded ? 'opacity-100' : 'opacity-0'
                          : 'opacity-100'
                      }`}
                      referrerPolicy="no-referrer"
                      loading={priority && idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </div>
                );
              })}
            </div>

            {/* Slider Navigation Dots (Requirement 3) */}
            {isSlider && (
              <div
                className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
                      currentSlide === idx
                        ? 'w-4 h-1.5 bg-white shadow-sm'
                        : 'w-1.5 h-1.5 bg-white/45 hover:bg-white/80'
                    }`}
                    title={`Slide ${idx + 1} of ${allImages.length}`}
                    aria-label={`Slide ${idx + 1} of ${allImages.length}`}
                  />
                ))}
              </div>
            )}
          </div>
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
      </a>
    </article>
  );
};
