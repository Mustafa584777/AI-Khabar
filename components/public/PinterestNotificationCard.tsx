'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PushNotificationItem } from '@/types/notification';
import { NotificationService } from '@/lib/notifications';
import { Bell, ChevronUp, ChevronDown, ExternalLink, Sparkles, Check, ArrowRight } from 'lucide-react';

interface PinterestNotificationCardProps {
  notification: PushNotificationItem;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  isCompact?: boolean;
}

export const PinterestNotificationCard: React.FC<PinterestNotificationCardProps> = ({
  notification,
  onRead,
  onDelete,
  isCompact = false,
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent if clicking an action button directly
    if ((e.target as HTMLElement).closest('button.action-btn')) {
      return;
    }
    NotificationService.recordNotificationClick(notification.id);
    if (onRead) onRead(notification.id);
    if (notification.url) {
      router.push(notification.url);
    }
  };

  const handleActionClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    NotificationService.recordNotificationClick(notification.id);
    if (onRead) onRead(notification.id);
    router.push(url);
  };

  // Determine images to show in the 4-card strip
  const images = notification.collageImages && notification.collageImages.length > 0
    ? notification.collageImages.slice(0, 4)
    : notification.imageUrl
    ? [notification.imageUrl]
    : [];

  const [timeAgo, setTimeAgo] = useState('recently');

  useEffect(() => {
    try {
      const diffMs = Date.now() - new Date(notification.sentAt).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) {
        setTimeAgo('just now');
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins}m ago`);
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          setTimeAgo(`${diffHours}h ago`);
        } else {
          const diffDays = Math.floor(diffHours / 24);
          setTimeAgo(`${diffDays}d ago`);
        }
      }
    } catch {
      setTimeAgo('recently');
    }
  }, [notification.sentAt]);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className={`relative w-full rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group text-left ${
        !notification.read ? 'ring-2 ring-red-500/20 dark:ring-red-500/30' : ''
      } ${isCompact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'}`}
    >
      {/* Unread indicator dot */}
      {!notification.read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#E60023] animate-pulse" />
      )}

      {/* Header Row: Pinterest Red Badge + App Name + Time + Bell */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* App Logo Badge with /logo.png */}
          <div className="w-8 h-8 rounded-full overflow-hidden shadow-xs shrink-0 select-none bg-neutral-100 dark:bg-neutral-800 relative border border-neutral-200 dark:border-neutral-700">
            <Image
              src="/logo.png"
              alt="tool.reelz"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">tool.reelz</span>
            <span>•</span>
            <span>{timeAgo}</span>
            <Bell className="w-3 h-3 text-neutral-400 fill-neutral-400" />
          </div>
        </div>

        {/* Expand / Collapse button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Prominent Bold Title (Replicating "Why is Pink Background everywhere right now?") */}
      <h3 className="mt-2 text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight leading-snug group-hover:text-[#E60023] transition-colors">
        {notification.title}
      </h3>

      {/* Subtitle (e.g. "You might like these searches") */}
      {notification.subtitle && (
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-medium mt-0.5">
          {notification.subtitle}
        </p>
      )}

      {/* Expanded Content: Visual Collage Strip & Actions */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Visual Cards Strip: Exactly 4 rounded vertical columns (Pinterest style) */}
          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[20/9]">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-xl sm:rounded-2xl overflow-hidden group/img shadow-xs"
                >
                  <Image
                    src={img}
                    alt={`${notification.title} preview ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 25vw, 15vw"
                    className="object-cover group-hover/img:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          ) : images.length === 1 ? (
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-xs">
              <Image
                src={images[0]}
                alt={notification.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-102 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}

          {/* Body description text if present */}
          {notification.body && notification.body !== notification.subtitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
              {notification.body}
            </p>
          )}

          {/* Action Pills & Category Tag */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Category Badge */}
              {notification.category && (
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  {notification.category}
                </span>
              )}
            </div>

            {/* Action Buttons (Pinterest Red Pill + Secondary Pill) */}
            <div className="flex items-center gap-2">
              {notification.actionButtons && notification.actionButtons.length > 0 ? (
                notification.actionButtons.map((action, aIdx) => (
                  <button
                    key={aIdx}
                    type="button"
                    onClick={(e) => handleActionClick(action.url, e)}
                    className={`action-btn px-3.5 py-1.5 rounded-full text-xs font-bold transition-all transform active:scale-95 flex items-center gap-1 ${
                      aIdx === 0
                        ? 'bg-[#E60023] hover:bg-[#ad081b] text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleActionClick(notification.url, e)}
                  className="action-btn px-3.5 py-1.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                >
                  <span>Explore Ideas</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
