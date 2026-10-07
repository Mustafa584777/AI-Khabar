'use client';

import React from 'react';
import { NotificationsModal } from './NotificationsModal';
import { PageLoadingOverlay } from './PageLoadingOverlay';
import { FirstLoginBonusModal } from './FirstLoginBonusModal';

export const AppGlobalOverlays = () => {
  return (
    <>
      <NotificationsModal />
      <PageLoadingOverlay />
      <FirstLoginBonusModal />
    </>
  );
};
