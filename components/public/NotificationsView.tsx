'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PushNotificationItem } from '@/types/notification';
import { NotificationService } from '@/lib/notifications';
import { NotificationCard } from './NotificationCard';
import { InterestSelectionModal } from './InterestSelectionModal';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  Sparkles,
  Zap,
  Volume2,
  Trash2,
  Info,
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { categories, showToast } = useApp();

  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState<boolean>(false);
  const [browserPushPermission, setBrowserPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [userInterests, setUserInterests] = useState<string[]>([]);

  // Load initial data & sync
  const loadNotifications = () => {
    const list = NotificationService.getNotifications();
    setNotifications(list);
    const prefs = NotificationService.getPreferences();
    setUserInterests(prefs.selectedInterests || []);
    setBrowserPushPermission(NotificationService.getBrowserPermissionStatus());
  };

  useEffect(() => {
    loadNotifications();
    NotificationService.syncWithServer().then(() => loadNotifications());

    // Listen for live push notifications across tabs
    const handleNewNotif = () => {
      loadNotifications();
    };
    window.addEventListener('promptcms_new_notification', handleNewNotif);

    // Periodic sync every 10 seconds for real-time delivery
    const interval = setInterval(() => {
      NotificationService.syncWithServer().then(() => loadNotifications());
    }, 10000);

    return () => {
      window.removeEventListener('promptcms_new_notification', handleNewNotif);
      clearInterval(interval);
    };
  }, []);

  const handleEnableBrowserPush = async () => {
    const granted = await NotificationService.requestPushPermission();
    setBrowserPushPermission(NotificationService.getBrowserPermissionStatus());
    if (granted) {
      showToast('Browser notifications enabled! You will now receive instant drops.');
      // Immediate real browser notification popup with sound chime
      await NotificationService.showNativeNotification({
        id: `notif-welcome-${Date.now()}`,
        title: 'tool.reelz: Trending Photo Prompts',
        subtitle: 'Browser Push Notifications Active! 🔔',
        body: 'You are now ready! Whenever trending prompts drop in your chosen categories, you will receive native alerts directly.',
        category: 'all',
        imageUrl: '/logo.png',
        url: '/notifications',
        sentAt: new Date().toISOString(),
      });
    } else {
      showToast('Notification permission was not granted in your browser.');
    }
  };

  const handleSendTestNotification = async () => {
    if (browserPushPermission !== 'granted') {
      await handleEnableBrowserPush();
      return;
    }

    const success = await NotificationService.showNativeNotification({
      id: `notif-test-${Date.now()}`,
      title: 'tool.reelz: Trending AI Photo Prompts',
      subtitle: 'Instant Browser Push Test 🔔',
      body: 'Live browser notification popup is working perfectly on your device!',
      category: 'all',
      imageUrl: '/logo.png',
      url: '/explore',
      sentAt: new Date().toISOString(),
    });

    if (success) {
      showToast('Test notification popup displayed on your device!');
    } else {
      showToast('Could not display test popup. Check if notifications are allowed.');
    }
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead();
    loadNotifications();
    showToast('All notifications marked as read.');
  };

  const handleClearAll = () => {
    if (confirm('Clear all notifications from your feed?')) {
      NotificationService.saveNotifications([]);
      setNotifications([]);
      showToast('Notification feed cleared.');
    }
  };

  const handleSingleRead = (id: string) => {
    NotificationService.markAsRead(id);
    loadNotifications();
  };

  // Filtered list
  const filteredNotifications = notifications.filter((item) => {
    if (unreadOnly && item.read) return false;
    if (selectedCategoryFilter === 'all') return true;
    if (!item.category) return true;
    return item.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase());
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Welcome & Control Header */}
      <div className="bg-gradient-to-br from-red-50 via-white to-amber-50/50 dark:from-red-950/20 dark:via-neutral-900 dark:to-amber-950/20 p-6 sm:p-8 rounded-3xl border border-red-200/60 dark:border-red-900/40 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#E60023] flex items-center justify-center text-white shadow-xs">
                <Bell className="w-4 h-4 fill-current" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Notifications & Updates
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[11px] font-black">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Personalized prompt drops and updates tailored strictly to your selected interests.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Customize Interests Button */}
            <button
              type="button"
              onClick={() => setIsInterestModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#E60023] text-xs font-bold text-neutral-800 dark:text-neutral-200 transition-all flex items-center gap-1.5 shadow-xs"
              id="btn-customize-interests"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E60023]" />
              <span>Select Interests</span>
            </button>

            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                Mark Read
              </button>
            )}
          </div>
        </div>

        {/* Browser Push Permission Banner temporarily hidden */}
        {false && browserPushPermission !== 'granted' && browserPushPermission !== 'unsupported' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#E60023]/10 border border-[#E60023]/30">
            <div className="flex items-center gap-3">
              <BellRing className="w-5 h-5 text-[#E60023] shrink-0 animate-bounce" />
              <div>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">
                  Turn on Browser Push Notifications
                </p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Receive instant lockscreen drops when viral prompts match your categories.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnableBrowserPush}
              className="px-4 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all shrink-0 cursor-pointer"
              id="btn-allow-push-notifications"
            >
              🔔 Enable Browser Notifications
            </button>
          </div>
        )}

        {/* Active Browser Push Status Banner temporarily hidden */}
        {false && browserPushPermission === 'granted' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Browser Push Notifications Active
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  This device is registered to receive instant real-time prompt drops.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-emerald-100 dark:hover:bg-neutral-700 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              id="btn-test-notification-popup"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Test Notification Popup</span>
            </button>
          </div>
        )}

        {/* Selected Interests Chips Preview */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mr-1">
            Active Interests:
          </span>
          {userInterests.map((interest) => (
            <span
              key={interest}
              className="px-2.5 py-0.5 rounded-full bg-red-100/70 dark:bg-red-950/60 text-[#E60023] text-[11px] font-bold border border-red-200/80 dark:border-red-900/60"
            >
              {interest}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setIsInterestModalOpen(true)}
            className="text-[11px] font-bold text-neutral-500 hover:text-[#E60023] ml-1 underline"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Filter and Tab Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedCategoryFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            All Updates ({notifications.length})
          </button>

          {userInterests.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategoryFilter === cat
                  ? 'bg-[#E60023] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Unread toggle */}
        <button
          type="button"
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
            unreadOnly
              ? 'bg-red-50 text-[#E60023] border-[#E60023]'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#E60023] text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Cards Feed */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onRead={handleSingleRead}
            />
          ))
        ) : (
          <div className="p-12 text-center rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              No notifications matching your filter
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              You&apos;re all caught up! As soon as new prompts are published in your selected categories, they will appear here.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('all');
                  setUnreadOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold"
              >
                Show All Notifications
              </button>
              <button
                type="button"
                onClick={() => setIsInterestModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#E60023] text-white text-xs font-bold"
              >
                Add More Categories
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interest Selection Modal */}
      <InterestSelectionModal
        isOpen={isInterestModalOpen}
        onClose={() => setIsInterestModalOpen(false)}
        onSaved={(newInterests) => {
          setUserInterests(newInterests);
          loadNotifications();
        }}
      />
    </div>
  );
};
