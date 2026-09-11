'use client';

import React, { useEffect, useState } from 'react';
import { PushNotificationItem } from '@/types/notification';
import { Bell, X, ExternalLink } from 'lucide-react';
import Image from 'next/image';

export const InAppNotificationBanner = () => {
  const [activeNotification, setActiveNotification] = useState<PushNotificationItem | null>(null);

  useEffect(() => {
    const handleNativePopup = (e: CustomEvent<PushNotificationItem>) => {
      if (e.detail) {
        setActiveNotification(e.detail);
        // Auto-dismiss after 6 seconds
        const timer = setTimeout(() => {
          setActiveNotification(null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('promptcms_native_popup', handleNativePopup as EventListener);
    return () => {
      window.removeEventListener('promptcms_native_popup', handleNativePopup as EventListener);
    };
  }, []);

  if (!activeNotification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-neutral-900/95 dark:bg-neutral-900/95 text-white backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-neutral-700 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-neutral-700 relative bg-neutral-800">
          <Image
            src={activeNotification.imageUrl || activeNotification.collageImages?.[0] || '/logo.png'}
            alt="Notification"
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-[#E60023] uppercase tracking-wider flex items-center gap-1">
              <Bell className="w-3 h-3 fill-current" />
              {activeNotification.category || 'Push Alert'}
            </span>
            <button
              onClick={() => setActiveNotification(null)}
              className="text-neutral-400 hover:text-white p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="text-xs font-bold text-white truncate">
            {activeNotification.title}
          </h4>
          <p className="text-[11px] text-neutral-300 line-clamp-2">
            {activeNotification.subtitle || activeNotification.body}
          </p>
          {activeNotification.url && (
            <a
              href={activeNotification.url}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300 pt-1"
            >
              <span>View Drop</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
