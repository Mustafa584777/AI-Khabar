'use client';

import React from 'react';
import { AppProvider } from '@/context/AppContext';
import { CMSLoginPage } from '@/components/admin/CMSLoginPage';
import { ToastNotification } from '@/components/public/ToastNotification';

export default function CMSLoginPageRoute() {
  return (
    <AppProvider>
      <CMSLoginPage />
      <ToastNotification />
    </AppProvider>
  );
}
