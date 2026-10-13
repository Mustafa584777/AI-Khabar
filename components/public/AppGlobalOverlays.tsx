'use client';

import React from 'react';
import { NotificationsModal } from './NotificationsModal';
import { PageLoadingOverlay } from './PageLoadingOverlay';
import { OfflineIndicator } from './OfflineIndicator';

export const AppGlobalOverlays = () => {
  return (
    <>
      <NotificationsModal />
      <PageLoadingOverlay />
      <OfflineIndicator />
    </>
  );
};
