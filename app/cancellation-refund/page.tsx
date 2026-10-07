'use client';

import React from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function CancellationRefundPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans pb-20 sm:pb-0">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-xs font-black">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Policy Guidelines</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Cancellation and Refund Policy</h1>
          <p className="text-xs text-neutral-500">Last updated: January 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">1. Subscription Cancellation</h2>
            <p>
              You can cancel your Pro or VIP subscription tier at any time from your Creator Dashboard or by contacting our support team. Upon cancellation, your membership benefits and tool credits will remain active until the end of your current paid billing cycle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">2. Refund Eligibility</h2>
            <p>
              Because our digital services provide instant access to premium AI master prompts and cloud tool credits upon purchase, all subscription and credit top-up sales are generally final and non-refundable.
            </p>
            <p>
              Exceptions may be considered on a case-by-case basis if duplicate charges occurred or if technical system errors prevented access to purchased features within 48 hours of transaction.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">3. Refund Request Process</h2>
            <p>
              To request a review of a transaction, please reach out via our Contact Us page with your registered email address, transaction ID, and reason for the request. Approved refunds are processed back to the original payment method within 5-7 business days.
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
