'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Bell,
  CheckCheck,
  Settings,
  Sparkles,
  ExternalLink,
  Trash2,
  Filter,
  Flame,
  Camera,
  Layers,
  Palette,
  Compass,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppNotification } from '@/types/prompt';

const emptySubscribe = () => () => {};

export const NotificationsDrawer = () => {
  const router = useRouter();
  const {
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    setIsNotificationPreferencesModalOpen,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    notificationPreferences,
    updateNotificationPreferences,
    posts,
    setSelectedPost,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'for-you' | 'all'>('for-you');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const now = React.useSyncExternalStore(emptySubscribe, () => Date.now(), () => 0);

  if (!isNotificationsDrawerOpen) return null;

  // Format relative timestamp
  const getRelativeTime = (timestamp: number) => {
    if (!now) return 'Recently';
    const diff = Math.max(0, now - timestamp);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('cyber') || lower.includes('neon')) return Flame;
    if (lower.includes('portrait') || lower.includes('photo')) return Camera;
    if (lower.includes('3d') || lower.includes('render')) return Layers;
    if (lower.includes('anime') || lower.includes('art')) return Palette;
    return Sparkles;
  };

  // Filter notifications based on tab and category
  const filteredNotifications = notifications.filter((notif) => {
    // 1. Tab filter
    if (activeTab === 'for-you') {
      const enabled = notificationPreferences.enabledCategories || ['all'];
      const isSubscribed =
        enabled.includes('all') ||
        enabled.some((cat) => cat.toLowerCase() === notif.category.toLowerCase()) ||
        notif.category.toLowerCase() === 'all';
      if (!isSubscribed) return false;
    }

    // 2. Specific category filter pill
    if (selectedCategoryFilter !== 'all') {
      if (notif.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // Unique categories in current notifications
  const availableCategories = Array.from(
    new Set(notifications.map((n) => n.category).filter(Boolean))
  );

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);

    // If target post ID exists, find and open that post card
    if (notif.targetPostId) {
      const targetPost = posts.find((p) => p.id === notif.targetPostId);
      if (targetPost) {
        setSelectedPost(targetPost);
        setIsNotificationsDrawerOpen(false);
        return;
      }
    }

    // Else if targetUrl exists
    if (notif.targetUrl && notif.targetUrl !== '/') {
      setIsNotificationsDrawerOpen(false);
      router.push(notif.targetUrl);
    }
  };

  const handleEnablePush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          updateNotificationPreferences({ browserPushEnabled: true });
          new Notification('🔔 Notifications Enabled!', {
            body: 'You will now receive personalized alerts when trending prompts in your chosen categories drop.',
            icon: '/logo.png',
          });
        } else {
          updateNotificationPreferences({ browserPushEnabled: false });
        }
      } catch (err) {
        console.error('Push permission error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-fade-in flex justify-end">
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800"
        id="pinterest-notifications-drawer"
      >
        {/* Pinterest Style Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-[#E60023] flex items-center justify-center relative">
              <Bell className="w-5 h-5 fill-current" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#E60023] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-neutral-900">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-neutral-900 dark:text-white text-base leading-tight">
                Notifications
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {unreadNotificationsCount > 0
                  ? `${unreadNotificationsCount} unread personalized updates`
                  : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="p-2 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Mark all as read"
                id="notif-mark-all-read-btn"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                setIsNotificationPreferencesModalOpen(true);
              }}
              className="p-2 rounded-full text-neutral-500 hover:text-[#E60023] hover:bg-red-50 dark:hover:bg-neutral-800 transition-colors"
              title="Tune notification interests & categories"
              id="notif-preferences-btn"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsNotificationsDrawerOpen(false)}
              className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              id="notif-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pinterest Filter Segmented Pills */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/70 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('for-you');
                setSelectedCategoryFilter('all');
              }}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'for-you'
                  ? 'bg-[#E60023] text-white shadow-xs'
                  : 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
              id="notif-tab-for-you"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>For You</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategoryFilter('all');
              }}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
              id="notif-tab-all"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>All Updates</span>
            </button>
          </div>

          {/* Subscribed category chips */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                }`}
              >
                All
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                    selectedCategoryFilter === cat
                      ? 'bg-[#E60023] text-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Browser Push Permission Banner (If not yet enabled) */}
        {!notificationPreferences.browserPushEnabled && (
          <div className="mx-4 my-3 p-3 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border border-red-200 dark:border-red-900/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#E60023] text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                  Instant Browser Alerts
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Get notified the moment new prompts in your niche drop.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              className="px-3 py-1.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-extrabold shrink-0 shadow-xs transition-transform active:scale-95"
              id="notif-enable-push-btn"
            >
              Turn On
            </button>
          </div>
        )}

        {/* Pinterest Style Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const IconComponent = getCategoryIcon(notif.category);
              const isUnread = !notif.read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 my-1 ${
                    isUnread
                      ? 'bg-red-50/40 dark:bg-neutral-800/60 hover:bg-red-50/70 dark:hover:bg-neutral-800'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                  id={`notif-card-${notif.id}`}
                >
                  {/* Left: Unread Dot + Category Icon */}
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${
                        isUnread ? 'bg-[#E60023]' : 'opacity-0'
                      }`}
                    />
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                        isUnread
                          ? 'bg-[#E60023] text-white'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Middle: Content Stack */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {notif.category}
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        • {getRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E60023] transition-colors">
                      {notif.title}
                    </h4>

                    <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {/* Right: Visual Prompt Thumbnail (Pinterest Iconic Right Card) */}
                  {notif.imageUrl && (
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-100 dark:bg-neutral-800 shadow-xs group-hover:scale-105 transition-transform">
                      <Image
                        src={notif.imageUrl}
                        alt={notif.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Dismiss button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-neutral-800/90 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3 my-8">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                No notifications in this view
              </h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                {activeTab === 'for-you'
                  ? 'We haven’t sent any updates matching your selected categories yet. Tune your interests to discover more!'
                  : 'You are completely up to date with all global prompt drops.'}
              </p>
              <button
                onClick={() => setIsNotificationPreferencesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-xs hover:scale-105 transition-transform"
                id="tune-interests-empty-btn"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Tune Interests & Categories</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer: Quick Interests Preference Link */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span>Personalized to your creative niche</span>
          <button
            onClick={() => setIsNotificationPreferencesModalOpen(true)}
            className="font-bold text-[#E60023] hover:underline flex items-center gap-1"
            id="notif-drawer-tune-link"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>
    </div>
  );
};
