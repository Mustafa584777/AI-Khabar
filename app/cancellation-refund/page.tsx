'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { RefreshCw, ArrowLeftRight, AlertCircle, CheckCircle2, LifeBuoy, ArrowRight, ShieldAlert } from 'lucide-react';

export default function CancellationRefundPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans pb-20 sm:pb-0">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-xs font-black">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Policy Guidelines</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Cancellation & Refund Policy</h1>
          <p className="text-xs text-neutral-500">Last updated: September 2026</p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-8 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {/* Important Highlight Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                Important Summary
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                Active subscription plans and credit packs cannot be cancelled once purchased. However, you can upgrade or downgrade your plan at any time. Any new plan purchased while an existing plan is active will be safely queued and will automatically start immediately after your current plan expires.
              </p>
            </div>
          </div>

          {/* Section 1: No Cancellation Policy */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-black text-base sm:text-lg">
              <ShieldAlert className="w-5 h-5 text-[#E60023]" />
              <h2>1. No Cancellation Policy</h2>
            </div>
            <p>
              Once a subscription plan (Starter, Pro, VIP, or Studio 499) or Pay-As-You-Go credit pack is purchased and activated on <strong>zeenaprompt.com</strong>, it <strong>cannot be cancelled</strong> or prematurely terminated for a refund.
            </p>
            <p>
              Because our digital systems immediately provision credits, AI search capabilities, and unrestricted prompt access to your account upon checkout confirmation, the service is considered fully delivered.
            </p>
          </section>

          {/* Section 2: Upgrades and Downgrades (Queued Activation) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-black text-base sm:text-lg">
              <ArrowLeftRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2>2. Plan Upgrades & Downgrades (Queued Activation)</h2>
            </div>
            <p>
              While active plans cannot be cancelled, you have the flexibility to <strong>upgrade or downgrade</strong> your plan tier whenever you choose:
            </p>
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Your Current Plan Stays Active:</strong> Your current tier benefits, quotas, and remaining validity period continue until the scheduled expiration date.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>New Plan is Safely Queued:</strong> The newly purchased plan is automatically scheduled in our queue and will seamlessly activate the moment your current plan ends.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>No Lost Validity:</strong> You will never lose any paid days from your existing subscription when switching tiers.
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Refund Policy */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">3. Refund Policy (Digital Products)</h2>
            <p>
              All purchases made through Razorpay on Zeena Prompt are strictly <strong>final and non-refundable</strong>. We do not provide prorated refunds, partial refunds, or credit refunds for unused tool credits, unused search quotas, or unused days in a billing cycle.
            </p>
            <p>
              Pay-as-you-go credit packs come with lifetime validity (they never expire) and are non-refundable once credited to your account balance.
            </p>
          </section>

          {/* Section 4: Duplicate Charge Exceptions */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">4. Technical & Duplicate Billing Exceptions</h2>
            <p>
              Exceptions are only considered in the rare event of a verified technical error or duplicate billing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <li>
                <strong>Duplicate Charges:</strong> If network latency or a payment gateway glitch results in multiple charges for the same transaction order.
              </li>
              <li>
                <strong>Verification:</strong> If confirmed via transaction logs, the duplicate transaction will be refunded back to the original source payment method within 5–7 business days.
              </li>
            </ul>
          </section>

          {/* Section 5: Data Safety After Expiry */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">5. Account Data & Saved Items After Expiry</h2>
            <p>
              When an active plan reaches the end of its duration without renewal, your account transitions to the Free tier. Your saved prompts, bookmarks, and past generation history remain <strong>100% safe and intact</strong>.
            </p>
          </section>

          {/* Section 6: Support Card & Contact Button */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-neutral-50 dark:from-red-950/20 dark:to-neutral-900 border border-red-200/80 dark:border-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm sm:text-base">
                  <LifeBuoy className="w-5 h-5 text-[#E60023]" />
                  <span>Need Assistance or Have Questions?</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-lg">
                  If you have billing inquiries, experienced a duplicate transaction, or need help managing your plan, our support team is here to assist you.
                </p>
              </div>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#cc001f] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all shrink-0 w-full sm:w-auto"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
