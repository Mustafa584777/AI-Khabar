'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { RazorpayCheckoutButton } from '@/components/public/RazorpayCheckoutButton';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Crown,
  CheckCircle2,
  XCircle,
  Bookmark,
  History,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Infinity,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const PromptDetailModal = dynamic(() => import('@/components/public/PromptDetailModal').then((m) => m.PromptDetailModal), { ssr: false });
const BookmarksDrawer = dynamic(() => import('@/components/public/BookmarksDrawer').then((m) => m.BookmarksDrawer), { ssr: false });
const TasteProfileModal = dynamic(() => import('@/components/public/TasteProfileModal').then((m) => m.TasteProfileModal), { ssr: false });
const SearchExploreModal = dynamic(() => import('@/components/public/SearchExploreModal').then((m) => m.SearchExploreModal), { ssr: false });
const UserAuthModal = dynamic(() => import('@/components/public/UserAuthModal').then((m) => m.UserAuthModal), { ssr: false });
const AdminLoginModal = dynamic(() => import('@/components/admin/AdminLoginModal').then((m) => m.AdminLoginModal), { ssr: false });
const RazorpayCheckoutModal = dynamic(() => import('@/components/public/RazorpayCheckoutModal').then((m) => m.RazorpayCheckoutModal), { ssr: false });
const UnlockPremiumModal = dynamic(() => import('@/components/public/UnlockPremiumModal').then((m) => m.UnlockPremiumModal), { ssr: false });
const NotificationsDrawer = dynamic(() => import('@/components/public/NotificationsDrawer').then((m) => m.NotificationsDrawer), { ssr: false });
const NotificationPreferencesModal = dynamic(() => import('@/components/public/NotificationPreferencesModal').then((m) => m.NotificationPreferencesModal), { ssr: false });
const ToastNotification = dynamic(() => import('@/components/public/ToastNotification').then((m) => m.ToastNotification), { ssr: false });

export default function PricingPage() {
  const { isProUser, planTier, toolCredits, promptRequestsRemaining } = useApp();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does unlimited prompt and history saving work?',
      a: 'All monthly subscription plans (Starter, Pro, and VIP) include unlimited prompt saves and unlimited AI generation history saves. You can bookmark as many trending prompts as you like and save every AI image-to-prompt analysis permanently.',
    },
    {
      q: 'Can I cancel my subscription at any time?',
      a: 'Yes, absolutely. There are no lock-in periods or hidden fees. Your subscription and benefits stay active for the entire billing cycle.',
    },
    {
      q: 'What payment options are supported?',
      a: 'We use official Razorpay payments supporting UPI (Google Pay, PhonePe, Paytm), credit/debit cards (Visa, Mastercard, RuPay), and Netbanking across all Indian banks.',
    },
    {
      q: 'What are AI Studio tool credits?',
      a: 'Each AI Studio generation (reverse-engineering prompts from uploaded photos or optical style breakdown) consumes 1 credit. Free tier includes 2 daily credits, while monthly plans come with 10, 50, or 200 monthly credits.',
    },
    {
      q: 'Are my saved prompts and history synced across devices?',
      a: 'Yes! When signed in, your bookmarks, generation history, and creative taste preferences are synced to the cloud so you can access them anywhere on any browser or mobile device.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-[#E60023] text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Razorpay Secured Monthly Subscription</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
            Elevate Your AI Creativity with Pro
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Pick a monthly plan to unlock full prompt libraries, AI Studio credits, and exclusive unlimited saves for both prompts and generation history.
          </p>

          {/* Premium Highlight Pill */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border border-red-300 dark:border-red-800/60 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-bold">
            <Infinity className="w-4 h-4 text-[#E60023]" />
            <span>Included in all Monthly Plans: <strong>Unlimited Saved Prompts & History Saves</strong></span>
          </div>

          {isProUser && (
            <div className="inline-flex flex-wrap items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Active Plan: <span className="uppercase font-black text-amber-600 dark:text-amber-400">{planTier || 'Pro'}</span></span>
              <span>•</span>
              <span>Tool Credits: <span className="font-black">{toolCredits}</span></span>
              <span>•</span>
              <span>Prompt Requests: <span className="font-black">{promptRequestsRemaining}</span></span>
            </div>
          )}
        </div>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {/* Tier 1: Starter */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">Starter</h2>
                <p className="text-xs text-neutral-500">Essential monthly creative access</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">₹49</span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlimited saved prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlimited history saves</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Unlock all premium prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span><strong>10</strong> AI Studio tool credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span><strong>1</strong> custom prompt request</span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={4900}
              planTier="starter"
              planName="Starter"
              description="Monthly Starter Plan - Unlimited Saves & 10 Credits"
              buttonText="Get Starter for ₹49/mo"
              variant="secondary"
              className="w-full"
            />
          </div>

          {/* Tier 2: Pro (Featured) */}
          <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-[#E60023] shadow-xl shadow-red-500/10 flex flex-col justify-between space-y-6 transform md:-translate-y-2">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#E60023] to-[#ff3b56] text-white text-[11px] font-black uppercase tracking-wider shadow-md">
              Most Popular
            </span>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">Pro</h2>
                <p className="text-xs text-neutral-500">For active digital artists & creators</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">₹199</span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E60023] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span className="font-bold text-[#E60023]">Unlimited saved prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E60023] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span className="font-bold text-[#E60023]">Unlimited history saves</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E60023] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Unlock all premium prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E60023] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span><strong>50</strong> AI Studio tool credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E60023] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span><strong>3</strong> custom prompt requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E60023] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Priority generation queue</span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={19900}
              planTier="pro"
              planName="Pro"
              description="Monthly Pro Plan - Unlimited Saves & 50 Credits"
              buttonText="Get Pro for ₹199/mo"
              variant="pill"
              size="lg"
              className="w-full"
            />
          </div>

          {/* Tier 3: VIP */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">VIP</h2>
                <p className="text-xs text-neutral-500">Power creators & commercial studios</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">₹499</span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlimited saved prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlimited history saves</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Unlock all premium prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span><strong>200</strong> AI Studio tool credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span><strong>10</strong> custom prompt requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>VIP 1-on-1 priority support</span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={49900}
              planTier="vip"
              planName="VIP"
              description="Monthly VIP Plan - Unlimited Saves & 200 Credits"
              buttonText="Get VIP for ₹499/mo"
              variant="primary"
              className="w-full"
            />
          </div>
        </div>

        {/* Plan Comparison Table */}
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              Compare Monthly Subscription Features
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500">
              See how the free tier compares with our monthly subscription plans
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
                  <th className="p-4 sm:p-5 font-black text-neutral-900 dark:text-white">Feature</th>
                  <th className="p-4 sm:p-5 font-bold text-neutral-500 text-center">Free Tier</th>
                  <th className="p-4 sm:p-5 font-bold text-neutral-900 dark:text-white text-center">Starter (₹49/mo)</th>
                  <th className="p-4 sm:p-5 font-black text-[#E60023] text-center bg-red-50/50 dark:bg-red-950/20">Pro (₹199/mo)</th>
                  <th className="p-4 sm:p-5 font-bold text-purple-600 dark:text-purple-400 text-center">VIP (₹499/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#E60023]" />
                    <span>Saved Prompts (Bookmarks)</span>
                  </td>
                  <td className="p-4 sm:p-5 text-center text-neutral-400">
                    <span className="text-xs">Preview only</span>
                  </td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    Unlimited
                  </td>
                  <td className="p-4 sm:p-5 text-center font-black text-[#E60023] bg-red-50/50 dark:bg-red-950/20">
                    Unlimited
                  </td>
                  <td className="p-4 sm:p-5 text-center font-bold text-purple-600 dark:text-purple-400">
                    Unlimited
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#E60023]" />
                    <span>AI Generation History Save</span>
                  </td>
                  <td className="p-4 sm:p-5 text-center text-neutral-400">
                    <span className="text-xs">None</span>
                  </td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    Unlimited Saves
                  </td>
                  <td className="p-4 sm:p-5 text-center font-black text-[#E60023] bg-red-50/50 dark:bg-red-950/20">
                    Unlimited Saves
                  </td>
                  <td className="p-4 sm:p-5 text-center font-bold text-purple-600 dark:text-purple-400">
                    Unlimited Saves
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-neutral-900 dark:text-white">
                    Unlock Premium Prompts
                  </td>
                  <td className="p-4 sm:p-5 text-center text-neutral-400">
                    <XCircle className="w-4 h-4 mx-auto text-neutral-300 dark:text-neutral-700" />
                  </td>
                  <td className="p-4 sm:p-5 text-center text-emerald-600 font-bold">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#E60023] font-black bg-red-50/50 dark:bg-red-950/20">
                    <Check className="w-4 h-4 mx-auto stroke-[3]" />
                  </td>
                  <td className="p-4 sm:p-5 text-center text-purple-600 font-bold">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-neutral-900 dark:text-white">
                    AI Studio Tool Credits
                  </td>
                  <td className="p-4 sm:p-5 text-center text-neutral-500">2 / day</td>
                  <td className="p-4 sm:p-5 text-center font-semibold">10 / mo</td>
                  <td className="p-4 sm:p-5 text-center font-black text-[#E60023] bg-red-50/50 dark:bg-red-950/20">50 / mo</td>
                  <td className="p-4 sm:p-5 text-center font-semibold">200 / mo</td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-neutral-900 dark:text-white">
                    Custom Prompt Requests
                  </td>
                  <td className="p-4 sm:p-5 text-center text-neutral-400">0</td>
                  <td className="p-4 sm:p-5 text-center font-semibold">1</td>
                  <td className="p-4 sm:p-5 text-center font-black text-[#E60023] bg-red-50/50 dark:bg-red-950/20">3</td>
                  <td className="p-4 sm:p-5 text-center font-semibold">10</td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-neutral-900 dark:text-white">
                    Priority Queue & Support
                  </td>
                  <td className="p-4 sm:p-5 text-center text-neutral-400">Standard</td>
                  <td className="p-4 sm:p-5 text-center text-neutral-600 dark:text-neutral-400">Standard</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-[#E60023] bg-red-50/50 dark:bg-red-950/20">Priority</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-purple-600 dark:text-purple-400">VIP 1-on-1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center justify-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#E60023]" />
              <span>Frequently Asked Questions</span>
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500">
              Everything you need to know about our monthly plans and unlimited saves
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 transition-transform ${
                      openFaqIndex === idx ? 'rotate-180 text-[#E60023]' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 sm:px-5 pb-4 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />

      {/* Global Modals & Overlays */}
      <PromptDetailModal />
      <BookmarksDrawer />
      <SearchExploreModal />
      <TasteProfileModal />
      <UserAuthModal />
      <AdminLoginModal />
      <ToastNotification />
      <RazorpayCheckoutModal />
      <UnlockPremiumModal />
      <NotificationsDrawer />
      <NotificationPreferencesModal />
    </div>
  );
}
