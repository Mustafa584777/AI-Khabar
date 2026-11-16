'use client';

import React from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { PromptEditorTool } from '@/components/public/PromptEditorTool';

export default function PromptEditorPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />
      <main className="flex-1 w-full" id="prompt-editor-page-main">
        <PromptEditorTool />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
