'use client';

import React from 'react';
import { NotificationsModal } from './NotificationsModal';
import { PageLoadingOverlay } from './PageLoadingOverlay';
import { OfflineIndicator } from './OfflineIndicator';
import { NetlifyBadgeRemover } from './NetlifyBadgeRemover';
import { UserAuthModal } from './UserAuthModal';
import { UnlockPremiumModal } from './UnlockPremiumModal';

export const AppGlobalOverlays = () => {
  return (
    <>
      <NotificationsModal />
      <PageLoadingOverlay />
      <OfflineIndicator />
      <NetlifyBadgeRemover />
      <UserAuthModal />
      <UnlockPremiumModal />
    </>
  );
};
