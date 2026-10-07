'use client';

import React from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { Sparkles, Users, Award, ShieldCheck, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans pb-20 sm:pb-0">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-xs font-black">
            <Sparkles className="w-4 h-4" />
            <span>About Gemini Prompt Generator</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Empowering AI Creators Worldwide
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Gemini Prompt Generator is the premier copy-paste photo and art prompt directory optimized for Gemini, ChatGPT, Midjourney, and Flux. We make high-end AI generation accessible to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">500k+ Creators</h3>
            <p className="text-xs text-neutral-500">Trusted by designers, photographers, and prompt engineers globally.</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">High Fidelity</h3>
            <p className="text-xs text-neutral-500">Meticulously crafted prompts engineered for stunning cinematic results.</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">AI Studio Lab</h3>
            <p className="text-xs text-neutral-500">Advanced image-to-prompt reverse-engineering and idea generators.</p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="text-lg font-black">Our Mission</h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            We believe that generative AI should be frictionless and precise. Instead of spending hours tinkering with parameters, our platform gives you instant access to professionally tested master prompts. Whether you are generating photorealistic portraits, cinematic landscapes, or vibrant anime art, Gemini Prompt Generator is your ultimate creative companion.
          </p>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
