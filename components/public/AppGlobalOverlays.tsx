'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { ToastNotification } from './ToastNotification';
import { PageLoadingOverlay } from './PageLoadingOverlay';
import { OfflineIndicator } from './OfflineIndicator';
import { NetlifyBadgeRemover } from './NetlifyBadgeRemover';

const PromptDetailModal = dynamic(() => import('./PromptDetailModal').then((m) => m.PromptDetailModal), { ssr: false });
const BookmarksDrawer = dynamic(() => import('./BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const SearchExploreModal = dynamic(() => import('./SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const NotificationsModal = dynamic(() => import('./NotificationsModal').then((m) => m.NotificationsModal), { ssr: false });
const TasteProfileModal = dynamic(() => import('./TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const UserAuthModal = dynamic(() => import('./UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const UnlockPremiumModal = dynamic(() => import('./UnlockPremiumModal').then((m) => m.UnlockPremiumModal), { ssr: false });
const RazorpayCheckoutModal = dynamic(() => import('./RazorpayCheckoutModal').then((m) => m.RazorpayCheckoutModal), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });

export const AppGlobalOverlays = () => {
  const {
    selectedPost,
    isDirectRouteHost,
    isBookmarksDrawerOpen,
    isSearchModalOpen,
    isNotificationsModalOpen,
    isTasteModalOpen,
    isUserAuthModalOpen,
    isUnlockPremiumModalOpen,
    isProCheckoutModalOpen,
    showLoginModal,
  } = useApp();

  // Register 7-day SW caching and warm interactive overlay chunks lazily after first paint (0ms TBT)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initBackground = async () => {
      if ('serviceWorker' in navigator && (window.isSecureContext || window.location.hostname === 'localhost')) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          if (reg && typeof reg.update === 'function') {
            void reg.update().catch(() => {});
          }
        } catch {}
      }

      // Pre-warm commonly clicked overlay chunks after idle so Saved / Search / Card / SignIn respond in 0ms
      const warmOverlays = () => {
        void import('./BookmarksDrawer');
        void import('./SearchExploreModal');
        void import('./PromptDetailModal');
        void import('./UserAuthModal');
      };

      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(warmOverlays, { timeout: 3000 });
      } else {
        setTimeout(warmOverlays, 2500);
      }
    };

    if (document.readyState === 'complete') {
      void initBackground();
    } else {
      const handler = () => void initBackground();
      window.addEventListener('load', handler, { once: true });
      return () => window.removeEventListener('load', handler);
    }
  }, []);

  return (
    <>
      {selectedPost && !isDirectRouteHost && <PromptDetailModal />}
      {isBookmarksDrawerOpen && <BookmarksDrawer />}
      {isSearchModalOpen && <SearchExploreModal />}
      {isNotificationsModalOpen && <NotificationsModal />}
      {isTasteModalOpen && <TasteProfileModal />}
      {isUserAuthModalOpen && <UserAuthModal />}
      {isUnlockPremiumModalOpen && <UnlockPremiumModal />}
      {isProCheckoutModalOpen && <RazorpayCheckoutModal />}
      {showLoginModal && <AdminLoginModal />}
      <ToastNotification />
      <PageLoadingOverlay />
      <OfflineIndicator />
      <NetlifyBadgeRemover />
    </>
  );
};
