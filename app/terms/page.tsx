'use client';

import React from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { FileText, ShieldCheck } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans pb-20 sm:pb-0">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-xs font-black">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Terms and Conditions</h1>
          <p className="text-xs text-neutral-500">Last updated: January 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Gemini Prompt Generator, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, please discontinue use of our website and services immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">2. Use of Prompts & Services</h2>
            <p>
              All prompts, templates, and digital assets provided on Gemini Prompt Generator are for personal and commercial AI generation projects. You may copy, modify, and use prompts freely in supported third-party AI platforms such as Midjourney, ChatGPT, and Gemini.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">3. Accounts & Subscriptions</h2>
            <p>
              When you create an account or purchase a membership plan (Starter, Pro, VIP), you agree to provide accurate information. Subscription fees and tool credits are non-refundable except as expressly outlined in our Cancellation and Refund Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">4. Intellectual Property</h2>
            <p>
              The platform design, layout, code, and curated prompt collections are protected by copyright laws. Unauthorized scraping or redistribution of the core database is strictly prohibited.
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
