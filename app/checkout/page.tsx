'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { RazorpayCheckoutButton } from '@/components/public/RazorpayCheckoutButton';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Coins,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Check,
  X,
  Clock,
  Mail,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatExpiryDateWithHour } from '@/lib/plans';

const FAQS = [
  {
    question: 'What does the ₹99/year Pro Yearly plan include?',
    answer: 'For just ₹99 per year (365 days), you unlock all benefits: unlimited access to all premium prompts, Bulk Upload in the Watermark Remover tool, clean prompts with no watermark text on copy, 120 prompt tool credits for AI prompt generation/extraction/editing, AI Search (3 daily searches), and unlimited saves & history.',
  },
  {
    question: 'How many tool credits do I receive with the ₹99/year plan?',
    answer: 'You receive 120 prompt tool credits upfront for the full year. Unused credits remain safely in your account and never disappear.',
  },
  {
    question: 'Can I renew or extend my Pro Yearly plan while it is still active?',
    answer: 'Yes! If you purchase the ₹99/year plan while your current plan is still active, your new yearly plan is safely queued and automatically starts immediately after your active plan expires at 11:59 PM.',
  },
  {
    question: 'What happens to my saved data after my yearly plan expires?',
    answer: 'Your saved prompts, AI history, unlocked items, and remaining tool credits are 100% safe and never deleted. Your account simply returns to the Free tier while keeping everything intact.',
  },
  {
    question: 'What payment methods are supported via Razorpay?',
    answer: 'We accept all major Indian and international payment methods via secure Razorpay checkout, including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards (Visa, MasterCard, RuPay), NetBanking, and Wallets.',
  },
  {
    question: 'What is AI Search and how does it work?',
    answer: 'AI Search lets you discover curated visual prompts using natural conversational queries. The ₹99/year Pro Yearly plan includes 3 AI searches every single day.',
  },
];

export default function CheckoutPage() {
  const { isProUser, planTier, toolCredits, planExpiresAt, queuedPlan } = useApp();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Official Razorpay Standard Web Checkout</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            One Simple Yearly Plan for Creators
          </h1>

          <p className="text-xs sm:text-base text-neutral-600 dark:text-neutral-400">
            Unlock every single Pro feature for an entire year at just ₹99/year — including all premium prompts, clean watermark-free copied prompts, AI Search, unlimited saves & history, and 120 prompt tool credits.
          </p>

          {/* Current User Status */}
          <div className="inline-flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold shadow-xs">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
              <Coins className="w-4 h-4" />
              Your Balance: {toolCredits} Credits
            </span>
            {isProUser && (
              <>
                <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {(planTier === 'free' ? 'PRO' : planTier || 'Pro').toUpperCase()} Yearly Plan{' '}
                  {planExpiresAt ? `(Expires ${formatExpiryDateWithHour(planExpiresAt)})` : ''}
                </span>
              </>
            )}
            {queuedPlan && (
              <>
                <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Clock className="w-3.5 h-3.5" />
                  Upcoming: {queuedPlan.planName?.toUpperCase() || 'PRO YEARLY'} Scheduled
                </span>
              </>
            )}
          </div>
        </div>

        {/* Single Annual Plan Card (₹99/year) */}
        <div className="max-w-md mx-auto">
          <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-[#E60023] shadow-xl flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
              All-Access Annual Pass
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] dark:text-red-400 text-[11px] font-black">
                  365 Days Full Access
                </span>
              </div>

              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">Pro Yearly</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  All premium benefits unlocked for 1 full year
                </p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-neutral-900 dark:text-white">₹99</span>
                <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">/ year</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white">
                    Unlock all premium prompts
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                  <span>
                    <strong className="text-neutral-900 dark:text-white">120</strong> prompt tool credits
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white">
                    AI Search (3 daily smart searches)
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white">
                    No Watermark Text on copied prompts
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white">
                    Bulk upload in Watermark Remover
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                  <span className="font-bold text-[#E60023]">
                    Unlimited saves & history
                  </span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={9900}
              planTier="pro"
              billingCycle="yearly"
              planName="Pro Yearly"
              description="1 Year Pro Access • 120 Credits • All Premium Prompts • AI Search • Unlimited Saves"
              buttonText="Get Pro Yearly for ₹99/year"
              variant="pill"
              size="lg"
              className="w-full text-sm"
            />
          </div>
        </div>

        {/* Features Comparison Table */}
        <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              Free vs Pro Yearly
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Everything unlocked with one simple ₹99/year membership.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold">
                  <th className="py-3 px-4">Feature / Benefit</th>
                  <th className="py-3 px-4 text-center">Free</th>
                  <th className="py-3 px-4 text-center text-[#E60023]">Pro Yearly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Price</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600">₹0 Free</td>
                  <td className="py-3.5 px-4 text-center font-black text-[#E60023]">₹99 / year</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                    Tool Credits
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium">5 Credits</td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">
                    120 Credits
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                    AI Search
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium"><X className="w-4 h-4 text-red-500 inline-block" /></td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 text-emerald-500 inline-block mr-1" />
                    <span>3 Daily</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Saves & History Limit</td>
                  <td className="py-3.5 px-4 text-center font-medium">10 saves</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Premium Prompts</td>
                  <td className="py-3.5 px-4 text-center font-medium"><X className="w-4 h-4 text-red-500 inline-block" /></td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 text-emerald-500 inline-block mr-1" />
                    <span>All Unlocked</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Copied Prompt Watermark</td>
                  <td className="py-3.5 px-4 text-center font-medium text-neutral-500">Watermark Added</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 text-emerald-500 inline-block mr-1" />
                    <span>No Watermark Text</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Watermark Remover Bulk Upload</td>
                  <td className="py-3.5 px-4 text-center font-medium"><X className="w-4 h-4 text-red-500 inline-block" /></td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 text-emerald-500 inline-block mr-1" />
                    <span>Bulk Upload Unlocked</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-neutral-500">
                Everything you need to know about the ₹99/year Pro Yearly plan
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/80 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-200/40 dark:border-neutral-700/40 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Accepted Payment Methods */}
        <div className="p-6 rounded-3xl bg-neutral-100 dark:bg-neutral-900 text-center space-y-2 max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            All Standard Payment Methods Accepted
          </div>
          <p className="text-xs text-neutral-500">
            UPI (Google Pay, PhonePe, Paytm, BHIM), Credit & Debit Cards (Visa, MasterCard, RuPay), NetBanking (50+ Indian banks), and Digital Wallets via secure Razorpay checkout.
          </p>
        </div>

        {/* Contact Support */}
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-red-50 via-rose-50 to-red-100 dark:from-red-950/40 dark:via-neutral-900 dark:to-red-950/20 border border-red-200 dark:border-red-900/60 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E60023] text-white flex items-center justify-center mx-auto shadow-md shadow-red-500/30">
            <Mail className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
              Need Help or Support?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Have questions about plans, payments, or prompts? Get in touch with our team.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all transform active:scale-95"
          >
            <span>Contact Us</span>
          </Link>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
