'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationService } from '@/lib/notifications';
import { Bell, BellRing, X, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationHelpModal } from './NotificationHelpModal';

export const NotificationPermissionBanner: React.FC = () => {
  const { showToast, userAccount } = useApp();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // STRICT USER REQUIREMENT: Only show notification prompt after user is logged in
    if (!userAccount?.isLoggedIn) {
      return;
    }

    // Only show if status is default (not yet granted or denied)
    if (Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('dismissed_push_permission_prompt');
      if (!dismissed) {
        // Show after a brief delay so the page loads smoothly
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [userAccount?.isLoggedIn]);

  const handleAllowNotifications = async () => {
    setIsProcessing(true);
    try {
      const result = await NotificationService.requestPushPermissionWithDetails();
      if (result.granted) {
        setShowPrompt(false);
        showToast('Browser notifications enabled! You will now receive instant 16:9 drops.');
        // Show immediate welcome notification in 16:9 widescreen
        await NotificationService.showNativeNotification({
          id: `notif-welcome-${Date.now()}`,
          title: 'tool.reelz: Trending Photo Prompts',
          subtitle: 'Push Notifications Active! 🔔',
          body: 'You are now ready! Whenever trending prompts drop in your chosen categories, you will receive native 16:9 alerts directly.',
          category: 'all',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&auto=format&fit=crop&q=80&ar=16:9',
          url: '/notifications',
          sentAt: new Date().toISOString(),
        });
      } else {
        setShowPrompt(false);
        showToast(result.message || 'Notifications were not enabled.');
        // If blocked due to incognito or browser settings, pop up the helpful guide
        if (
          result.reason === 'incognito' ||
          result.reason === 'blocked_in_settings' ||
          result.reason === 'ios_not_pwa' ||
          result.status === 'denied'
        ) {
          setIsHelpOpen(true);
        }
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('dismissed_push_permission_prompt', 'true');
    setShowPrompt(false);
  };

  const isVisible = showPrompt && Boolean(userAccount?.isLoggedIn);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-md w-[calc(100%-2rem)] sm:w-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3"
            id="floating-notification-allow-banner"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E60023]/10 text-[#E60023] flex items-center justify-center shrink-0 shadow-xs">
                  <BellRing className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white tracking-tight">
                      Allow Instant Notifications
                    </h4>
                    <span className="px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950/60 text-[#E60023] text-[9px] font-black uppercase">
                      16:9 Drops
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    Get real-time lockscreen drops when viral AI photo prompts match your chosen tastes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold transition-colors"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleAllowNotifications}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-md shadow-red-500/25 transition-all transform active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                id="btn-floating-allow-notifications"
              >
                <Bell className="w-3.5 h-3.5 fill-white" />
                <span>{isProcessing ? 'Enabling...' : 'Allow Notifications'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onPermissionGranted={() => {
          showToast('Notifications enabled!');
          setShowPrompt(false);
        }}
      />
    </>
  );
};
