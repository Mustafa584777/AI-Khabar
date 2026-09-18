'use client';

import React from 'react';
import { NotificationsModal } from './NotificationsModal';
import { PageLoadingOverlay } from './PageLoadingOverlay';

export const AppGlobalOverlays = () => {
  return (
    <>
      <NotificationsModal />
      <PageLoadingOverlay />
    </>
  );
};
