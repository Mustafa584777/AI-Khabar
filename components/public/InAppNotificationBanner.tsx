'use client';

import React, { useEffect, useState } from 'react';
import { PushNotificationItem } from '@/types/notification';
import { Bell, X, ExternalLink, Sparkles } from 'lucide-react';
import Image from 'next/image';

export const InAppNotificationBanner = () => {
  const [activeNotification, setActiveNotification] = useState<PushNotificationItem | null>(null);

  useEffect(() => {
    const handleNativePopup = (e: CustomEvent<PushNotificationItem>) => {
      if (e.detail) {
        setActiveNotification(e.detail);
        // Auto-dismiss after 8 seconds
        const timer = setTimeout(() => {
          setActiveNotification(null);
        }, 8000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('promptcms_native_popup', handleNativePopup as EventListener);
    return () => {
      window.removeEventListener('promptcms_native_popup', handleNativePopup as EventListener);
    };
  }, []);

  if (!activeNotification) return null;

  const collageImages =
    activeNotification.collageImages && activeNotification.collageImages.length > 0
      ? activeNotification.collageImages.slice(0, 4)
      : [];

  return (
    <div
      id="inapp-pinterest-notification-banner"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] sm:w-96 bg-neutral-900/95 text-white backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-neutral-700/80 animate-in slide-in-from-bottom-5 duration-300 ring-1 ring-white/10"
    >
      {/* Pinterest Notification Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#E60023] flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-[11px] font-black text-white leading-none">P</span>
          </div>
          <span className="text-xs font-bold text-neutral-200 truncate">tool.reelz</span>
          <span className="text-[10px] text-neutral-400 shrink-0">• now</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/40 uppercase tracking-wider flex items-center gap-1">
            <Bell className="w-2.5 h-2.5 fill-current" />
            <span className="truncate max-w-[90px]">{activeNotification.category || 'Trending'}</span>
          </span>
          <button
            onClick={() => setActiveNotification(null)}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors ml-1"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-1 mb-2.5">
        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
          {activeNotification.title}
        </h4>
        <p className="text-xs text-neutral-300 line-clamp-2">
          {activeNotification.subtitle || activeNotification.body}
        </p>
      </div>

      {/* 16:9 Image Presentation: 4-Card Photo Collage Strip or 16:9 Single Banner */}
      {collageImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-1.5 aspect-[16/9] w-full rounded-2xl overflow-hidden bg-neutral-950 p-1 border border-neutral-800 mb-3 shadow-inner">
          {collageImages.map((img, idx) => (
            <div
              key={idx}
              className="relative w-full h-full rounded-xl overflow-hidden bg-neutral-800"
            >
              <Image
                src={img}
                alt={`Preview pin ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 25vw, 90px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      ) : activeNotification.imageUrl ? (
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-800 border border-neutral-800 mb-3 shadow-inner">
          <Image
            src={activeNotification.imageUrl}
            alt={activeNotification.title}
            fill
            sizes="(max-width: 640px) 100vw, 360px"
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      {/* Action CTA Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <a
          href={activeNotification.url || '/'}
          onClick={() => setActiveNotification(null)}
          className="flex-1 bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold py-2 px-3 rounded-full text-center flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explore Prompts</span>
        </a>
        <button
          onClick={() => setActiveNotification(null)}
          className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
