'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { DashboardSkeleton } from '@/components/public/DashboardSkeleton';

const UserDashboard = dynamic(() => import('@/components/public/UserDashboard').then((m) => m.UserDashboard), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />
      <div className="flex-1">
        <UserDashboard />
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
}
