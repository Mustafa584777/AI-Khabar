'use client';

import React from 'react';
import { AppProvider } from '@/context/AppContext';
import { WordPressLoginPage } from '@/components/admin/WordPressLoginPage';
import { ToastNotification } from '@/components/public/ToastNotification';

export default function CMSLoginPage() {
  return (
    <AppProvider>
      <WordPressLoginPage />
      <ToastNotification />
    </AppProvider>
  );
}
