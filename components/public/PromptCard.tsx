'use client';

import React, { useState } from 'react';
import { PromptPost } from '@/types/prompt';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';
import { Sparkles, Bookmark } from 'lucide-react';
import { getPromptSlug } from '@/lib/utils';

export const PromptCard = ({ post }: { post: PromptPost }) => {
  const {
    setSelectedPost,
    toggleBookmark,
    bookmarkedIds,
    setCurrentView,
    showToast,
  } = useApp();

  const [imageLoaded, setImageLoaded] = useState(false);
  const isBookmarked = bookmarkedIds.includes(post.id);
  const promptSlug = getPromptSlug(post);

  const handleCardClick = (e: React.MouseEvent) => {
    // If user clicked with Cmd/Ctrl or middle click, let browser handle new tab
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    setSelectedPost(post);
    if (typeof window !== 'undefined') {
      window.history.pushState({ postId: post.id }, '', `/prompt/${promptSlug}`);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(post.id);
  };

  const handleGenerateImagePrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', post.promptText);
    }
    setCurrentView('studio-tool');
    showToast('Loaded prompt into AI Studio Image Generator!');
  };

  const handleDeconstructImagePrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', post.promptText);
      if (post.imageUrl) {
        sessionStorage.setItem('promptcms_studio_image_preload', post.imageUrl);
      }
    }
    setCurrentView('studio-tool');
    showToast('Loaded image & prompt into Image-to-Prompt Studio!');
  };

  return (
    <article
      className="group relative mb-4 break-inside-avoid rounded-[20px] sm:rounded-[24px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 select-none"
      id={`prompt-pin-${post.id}`}
      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
    >
      <a
        href={`/prompt/${promptSlug}`}
        onClick={handleCardClick}
        className="block relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 focus:outline-none min-h-[180px] sm:min-h-[220px]"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Shimmer Skeleton Placeholder for Slow Internet */}
        {!imageLoaded && post.imageUrl && (
          <div className="absolute inset-0 z-0 bg-neutral-200/90 dark:bg-neutral-800/90 animate-pulse flex flex-col items-center justify-center p-4">
            <div className="w-9 h-9 rounded-full bg-neutral-300/80 dark:bg-neutral-700/80 mb-2 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div className="w-16 h-2 rounded-full bg-neutral-300/80 dark:bg-neutral-700/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent animate-shimmer pointer-events-none" />
          </div>
        )}

        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.imageAlt || post.title}
            width={600}
            height={800}
            draggable={false}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-auto object-cover group-hover:scale-102 transition-all duration-500 ease-out select-none pointer-events-none relative z-1 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            referrerPolicy="no-referrer"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center bg-gradient-to-tr from-neutral-800 to-neutral-900 text-neutral-400">
            <Sparkles className="w-8 h-8 opacity-40" />
          </div>
        )}

        {/* Pinterest Dark Semi-Transparent Overlay with White Popup Action Buttons */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto flex items-center justify-center gap-3.5 z-10">
          {/* Popup Save Button in Pure White */}
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

          {/* Popup Generate Button in Pure White */}
          <button
            type="button"
            onClick={handleGenerateImagePrompt}
            className="w-12 h-12 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl flex items-center justify-center transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95"
            title="Generate Image in AI Studio"
            aria-label="Generate Image in AI Studio"
          >
            <Sparkles className="w-5 h-5 text-[#E60023]" />
          </button>

          {/* Popup Deconstruct / Decide Button in Pure White */}
          <button
            type="button"
            onClick={handleDeconstructImagePrompt}
            className="w-12 h-12 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl flex items-center justify-center transition-all duration-300 ease-out transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95"
            title="Deconstruct & Select Image in Image-to-Prompt Tool"
            aria-label="Deconstruct & Select Image"
          >
            <Sparkles className="w-5 h-5 text-amber-600" />
          </button>
        </div>
      </a>
    </article>
  );
};
