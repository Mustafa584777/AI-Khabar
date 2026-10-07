'use client';

import React from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { Sparkles } from 'lucide-react';

export default function AiPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans pb-20 sm:pb-0">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ethical Standards</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">AI Policy</h1>
          <p className="text-xs text-neutral-500">Last updated: January 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">1. Responsible AI Generation</h2>
            <p>
              Gemini Prompt Generator is committed to promoting safe, ethical, and responsible generative AI creation. Our prompts are curated to adhere to safety guidelines set by major AI providers such as Google Gemini, OpenAI, and Midjourney.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">2. Prohibited Content</h2>
            <p>
              Users are strictly prohibited from utilizing our platform, prompts, or tools to generate non-consensual deepfakes, hate speech, harassment, graphic violence, or misleading political misinformation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">3. Copyright & Attribution</h2>
            <p>
              AI-generated imagery created using our prompts belongs to the creator in accordance with the terms of service of the respective AI generation engine (Midjourney, ChatGPT, etc.).
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
