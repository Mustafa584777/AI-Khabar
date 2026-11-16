import React from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { WatermarkStudioShell } from '@/components/public/WatermarkStudioShell';

export default function FreeGeminiWatermarkRemoverPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />
      <main className="flex-1 w-full" id="watermark-remover-page-main">
        <WatermarkStudioShell />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
