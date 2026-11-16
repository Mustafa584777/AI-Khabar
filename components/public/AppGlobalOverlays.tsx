'use client';

import React, { useEffect } from 'react';
import { PromptDetailModal } from './PromptDetailModal';
import { BookmarksDrawer } from './BookmarksDrawer';
import { SearchExploreModal } from './SearchExploreModal';
import { NotificationsModal } from './NotificationsModal';
import { TasteProfileModal } from './TasteProfileModal';
import { UserAuthModal } from './UserAuthModal';
import { UnlockPremiumModal } from './UnlockPremiumModal';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { ToastNotification } from './ToastNotification';
import { PageLoadingOverlay } from './PageLoadingOverlay';
import { OfflineIndicator } from './OfflineIndicator';
import { NetlifyBadgeRemover } from './NetlifyBadgeRemover';

export const AppGlobalOverlays = () => {
  // Register 7-day ultra-fast page & prompt caching Service Worker globally on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && window.location.hostname !== 'localhost') return;

    const registerSw = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (reg && typeof reg.update === 'function') {
          void reg.update().catch(() => {});
        }
      } catch {
        // Silent fail if SW registration is blocked by browser privacy settings
      }
    };

    if (document.readyState === 'complete') {
      void registerSw();
    } else {
      window.addEventListener('load', registerSw, { once: true });
      return () => window.removeEventListener('load', registerSw);
    }
  }, []);

  return (
    <>
      <PromptDetailModal />
      <BookmarksDrawer />
      <SearchExploreModal />
      <NotificationsModal />
      <TasteProfileModal />
      <UserAuthModal />
      <UnlockPremiumModal />
      <RazorpayCheckoutModal />
      <AdminLoginModal />
      <ToastNotification />
      <PageLoadingOverlay />
      <OfflineIndicator />
      <NetlifyBadgeRemover />
    </>
  );
};
