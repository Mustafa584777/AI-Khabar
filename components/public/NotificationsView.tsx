'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PushNotificationItem } from '@/types/notification';
import { NotificationService } from '@/lib/notifications';
import { NotificationCard } from './NotificationCard';
import { InterestSelectionModal } from './InterestSelectionModal';
import { NotificationHelpModal } from './NotificationHelpModal';
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
  Lock,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { categories, showToast, userAccount, openAuthModal } = useApp();

  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
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
    const result = await NotificationService.requestPushPermissionWithDetails();
    setBrowserPushPermission(result.status);

    if (result.granted) {
      showToast('Browser notifications enabled! You will now receive instant drops.');
      // Immediate real browser notification popup with sound chime
      await NotificationService.showNativeNotification({
        id: `notif-welcome-${Date.now()}`,
        title: 'tool.reelz: Trending Photo Prompts',
        subtitle: 'Browser Push Notifications Active! 🔔',
        body: 'You are now ready! Whenever trending prompts drop in your chosen categories, you will receive native alerts directly.',
        category: 'all',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&auto=format&fit=crop&q=80&ar=16:9',
        url: '/notifications',
        sentAt: new Date().toISOString(),
      });
    } else {
      showToast(result.message || 'Notification permission was not granted.');
      // If blocked in incognito or site settings, open help modal
      if (
        result.reason === 'incognito' ||
        result.reason === 'blocked_in_settings' ||
        result.reason === 'ios_not_pwa' ||
        result.status === 'denied'
      ) {
        setIsHelpModalOpen(true);
      }
    }
  };

  const handleRecheckPermission = () => {
    const status = NotificationService.getBrowserPermissionStatus();
    setBrowserPushPermission(status);
    if (status === 'granted') {
      showToast('Notifications are active!');
    } else if (status === 'denied') {
      showToast('Notifications are blocked in this browser. Tap "How to Unblock".');
      setIsHelpModalOpen(true);
    } else {
      showToast('Status is ready to request.');
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
      body: 'Live browser notification popup is working in 16:9 widescreen on your device!',
      category: 'all',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1280&auto=format&fit=crop&q=80&ar=16:9',
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

        {/* 1. GUEST STATE: Prompt user to log in before enabling notifications */}
        {!userAccount?.isLoggedIn && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50/60 dark:from-red-950/30 dark:to-neutral-900 border border-red-200/80 dark:border-red-900/40 animate-in fade-in duration-300 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E60023]/15 text-[#E60023] flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                    Sign In to Turn on Push Notifications
                  </p>
                  <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-[#E60023] text-[9px] font-black uppercase">
                    Member Feature
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Log in to your account to enable instant 16:9 prompt drops tailored strictly to your selected interests.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('Sign in to enable browser push notifications')}
              className="px-4 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-md shadow-red-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              id="btn-login-to-allow-notifications"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Sign In to Enable</span>
            </button>
          </div>
        )}

        {/* 2. LOGGED-IN: Blocked / Denied State (Incognito or Browser Setting) */}
        {userAccount?.isLoggedIn && browserPushPermission === 'denied' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100">
                  Notifications are Blocked in your Browser
                </p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                  Blocked by browser privacy settings (common in Incognito / Private tabs, Brave shields, or Site Settings).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                id="btn-how-to-unblock-notifications"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>How to Unblock</span>
              </button>
              <button
                type="button"
                onClick={handleRecheckPermission}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-amber-300 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Re-check permission status"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                <span>Re-check</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. LOGGED-IN: Default / Ready to Allow State */}
        {userAccount?.isLoggedIn && browserPushPermission === 'default' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#E60023]/10 border border-[#E60023]/30 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E60023]/20 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 text-[#E60023] animate-bounce" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                  Turn on Browser Push Notifications
                </p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Receive instant 16:9 lockscreen drops when viral prompts match your selected categories.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnableBrowserPush}
              className="px-4 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-md shadow-red-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-allow-push-notifications"
            >
              <Bell className="w-3.5 h-3.5 fill-white" />
              <span>Allow Notifications</span>
            </button>
          </div>
        )}

        {/* 4. LOGGED-IN: Active Granted State */}
        {userAccount?.isLoggedIn && browserPushPermission === 'granted' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Browser Push Notifications Active
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  This device is registered to receive instant real-time 16:9 prompt drops.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-emerald-100 dark:hover:bg-neutral-700 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              id="btn-test-notification-popup"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Send Test Popup</span>
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

      {/* Unblock & Setup Help Modal */}
      <NotificationHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onPermissionGranted={() => {
          setBrowserPushPermission('granted');
          showToast('Notifications enabled successfully!');
          loadNotifications();
        }}
      />
    </div>
  );
};
