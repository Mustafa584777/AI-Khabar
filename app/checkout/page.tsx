'use client';

import React, { useState } from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { RazorpayCheckoutButton } from '@/components/public/RazorpayCheckoutButton';
import { RazorpayCheckoutModal } from '@/components/public/RazorpayCheckoutModal';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Crown,
  CheckCircle2,
  Coins,
  ArrowRight,
  Lock,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceRupees: number;
  amountPaise: number;
  rateText?: string;
  badge?: string | null;
  description: string;
  features: string[];
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'pill';
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack-120',
    name: 'Starter Pack',
    credits: 120,
    priceRupees: 1,
    amountPaise: 100,
    description: 'Great for getting started with image extraction & prompt tools',
    badge: null,
    icon: <Coins className="w-6 h-6 text-amber-500" />,
    features: [
      '120 instant tool credits (Never expire)',
      'Image-to-Prompt: up to 60 runs (2 cr each)',
      'Prompt Generator: up to 120 gens (1 cr each)',
      'Prompt Editor: up to 120 edits (1 cr each)',
    ],
    variant: 'secondary',
  },
  {
    id: 'pack-250',
    name: 'Creator Pack',
    credits: 250,
    priceRupees: 1,
    amountPaise: 100,
    description: 'Our most popular top-up for active visual designers',
    badge: 'Most Popular',
    icon: <Zap className="w-6 h-6 text-[#E60023]" />,
    features: [
      '250 instant tool credits (Never expire)',
      'Image-to-Prompt: up to 125 runs (2 cr each)',
      'Prompt Generator: up to 250 gens (1 cr each)',
      'Prompt Editor: up to 250 edits (1 cr each)',
    ],
    variant: 'pill',
  },
  {
    id: 'pack-550',
    name: 'Mega Pack',
    credits: 550,
    priceRupees: 1,
    amountPaise: 100,
    description: 'High-volume pack for content studios & power creators',
    badge: 'Best Value',
    icon: <Crown className="w-6 h-6 text-purple-500" />,
    features: [
      '550 instant tool credits (Never expire)',
      'Image-to-Prompt: up to 275 runs (2 cr each)',
      'Prompt Generator: up to 550 gens (1 cr each)',
      'Prompt Editor: up to 550 edits (1 cr each)',
    ],
    variant: 'primary',
  },
  {
    id: 'pack-1500',
    name: 'Studio Pack',
    credits: 1500,
    priceRupees: 1,
    amountPaise: 100,
    description: 'Ultimate studio pack for high-frequency prompt creation & extraction',
    badge: 'Studio Choice',
    icon: <Sparkles className="w-6 h-6 text-amber-500" />,
    features: [
      '1,500 instant tool credits (Never expire)',
      'Image-to-Prompt: up to 750 runs (2 cr each)',
      'Prompt Generator: up to 1,500 gens (1 cr each)',
      'Prompt Editor: up to 1,500 edits (1 cr each)',
    ],
    variant: 'secondary',
  },
];

const FAQS = [
  {
    question: 'Do tool credits expire?',
    answer: 'No! Pay-as-you-go credit packs never expire. You can use them whenever you need to unlock prompts or run image-to-prompt extractions. Monthly subscription credits refresh every billing cycle.',
  },
  {
    question: 'Can I cancel or change my monthly subscription anytime?',
    answer: 'Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your account settings. Your active tier benefits remain active until the end of your billing cycle.',
  },
  {
    question: 'What payment methods are supported via Razorpay?',
    answer: 'We accept all major Indian and international payment methods via secure Razorpay checkout, including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards (Visa, MasterCard, RuPay), NetBanking, and Wallets.',
  },
  {
    question: 'What is AI Search and how does it work?',
    answer: 'AI Search allows you to search across thousands of curated visual prompts using natural conversational queries. Paid monthly plans include generous AI Search quotas ranging from 100 searches up to unlimited in Studio 499.',
  },
  {
    question: 'How do prompt requests work for custom creations?',
    answer: 'Depending on your plan tier (Starter, Pro, VIP, Studio 499), you receive monthly custom prompt generation requests where our system crafts hyper-optimized prompts for your exact creative vision.',
  },
];

export default function CheckoutPage() {
  const { isProUser, planTier, toolCredits, promptRequestsRemaining } = useApp();
  const [billingView, setBillingView] = useState<'credits' | 'subscription'>('subscription');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-[#E60023] text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Razorpay Standard Web Checkout</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Flexible Plans & Credits for Every Creator
          </h1>

          <p className="text-xs sm:text-base text-neutral-600 dark:text-neutral-400">
            Choose a pay-as-you-go credit pack with no commitment, or subscribe monthly for recurring perks and request quotas.
          </p>

          {/* Current User Status */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 px-5 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold shadow-xs">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
              <Coins className="w-4 h-4" />
              Your Balance: {toolCredits} Credits
            </span>
            {isProUser && (
              <>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {(planTier || 'Pro').toUpperCase()} Member
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-neutral-500">
                  {promptRequestsRemaining} Prompt Requests Left
                </span>
              </>
            )}
          </div>

          {/* Segmented Tab Switcher */}
          <div className="pt-3 flex justify-center">
            <div className="inline-flex p-1.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingView('subscription')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billingView === 'subscription'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                id="tab-monthly-subscription"
              >
                <Crown className="w-3.5 h-3.5 text-purple-500" />
                <span>Monthly Subscription</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingView('credits')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billingView === 'credits'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                id="tab-credit-packs"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Credits Packs (Pay As You Go)</span>
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023] text-[10px] font-black">
                  New
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* View 1: Credits Packs */}
        {billingView === 'credits' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border ${
                    pack.badge
                      ? 'border-[#E60023] dark:border-[#E60023] ring-1 ring-[#E60023]/20 shadow-lg'
                      : 'border-neutral-200 dark:border-neutral-800 shadow-sm'
                  } flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow relative`}
                >
                  {pack.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#E60023] to-[#ff3b56] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      {pack.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      {pack.icon}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                        {pack.name}
                      </h3>
                      <p className="text-xs text-neutral-500">{pack.description}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
                          ₹{pack.priceRupees}
                        </span>
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                          for {pack.credits} credits
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                      {pack.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-[#E60023] font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <RazorpayCheckoutButton
                    amount={pack.amountPaise}
                    creditsToAdd={pack.credits}
                    planName={`${pack.credits} Credits Pack`}
                    description={`Instant ${pack.credits} Tool Credits Top-Up`}
                    buttonText={`Buy ${pack.credits} Credits (₹${pack.priceRupees})`}
                    variant={pack.variant}
                    size="md"
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setBillingView('subscription')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-[#E60023] transition-colors"
              >
                <span>Prefer recurring monthly membership? View Monthly Subscriptions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* View 2: Monthly Subscriptions */}
        {billingView === 'subscription' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Monthly / Yearly Billing Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-lg transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    billingCycle === 'yearly'
                      ? 'bg-white dark:bg-neutral-900 text-[#E60023] dark:text-red-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>Yearly Billing</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[#E60023] text-[10px] font-black uppercase tracking-wide">
                    Save ~20%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {/* Tier 1: Starter */}
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">Starter</h3>
                    <p className="text-xs text-neutral-500">Essential membership</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white">
                      ₹1
                    </span>
                    <span className="text-xs text-neutral-400">
                      {billingCycle === 'monthly' ? '/ month' : '/ year'}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Unlock all premium prompts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span><strong>100</strong> prompt tool credits / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span><strong>100 AI Searches</strong> / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span><strong>1 Prompt Request</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">100 saves & history</span>
                    </li>
                  </ul>
                </div>

                <RazorpayCheckoutButton
                  amount={100}
                  planTier="starter"
                  planName={billingCycle === 'monthly' ? 'Starter Monthly' : 'Starter Yearly'}
                  description={billingCycle === 'monthly' ? 'Monthly Starter - 100 Credits, 100 AI Searches' : 'Yearly Starter - 100 Credits/mo, 100 AI Searches/mo'}
                  buttonText="Get Starter for ₹1"
                  variant="secondary"
                  className="w-full text-xs"
                />
              </div>

              {/* Tier 2: Pro */}
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-[#E60023] shadow-lg flex flex-col justify-between space-y-6 relative hover:shadow-xl transition-shadow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
                  Most Popular
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">Pro</h3>
                    <p className="text-xs text-neutral-500">For active creators & prompt engineers</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white">
                      ₹1
                    </span>
                    <span className="text-xs text-neutral-400">
                      {billingCycle === 'monthly' ? '/ month' : '/ year'}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                    <li className="flex items-center gap-2">
                      <span className="text-[#E60023] font-bold">✓</span>
                      <span className="font-bold">Unlock all premium prompts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#E60023] font-bold">✓</span>
                      <span><strong>250</strong> prompt tool credits / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#E60023] font-bold">✓</span>
                      <span><strong>200 AI Searches</strong> / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#E60023] font-bold">✓</span>
                      <span><strong>2 Prompt Requests</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#E60023] font-bold">✓</span>
                      <span className="font-bold text-[#E60023]">200 saves & history</span>
                    </li>
                  </ul>
                </div>

                <RazorpayCheckoutButton
                  amount={100}
                  planTier="pro"
                  planName={billingCycle === 'monthly' ? 'Pro Monthly' : 'Pro Yearly'}
                  description={billingCycle === 'monthly' ? 'Monthly Pro - 250 Credits, 200 AI Searches' : 'Yearly Pro - 250 Credits/mo, 200 AI Searches/mo'}
                  buttonText="Get Pro for ₹1"
                  variant="pill"
                  size="md"
                  className="w-full text-xs"
                />
              </div>

              {/* Tier 3: VIP */}
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
                    <Crown className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">VIP</h3>
                    <p className="text-xs text-neutral-500">Power creators & studios</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white">
                      ₹1
                    </span>
                    <span className="text-xs text-neutral-400">
                      {billingCycle === 'monthly' ? '/ month' : '/ year'}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span className="font-bold">Unlock all premium prompts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span><strong>600</strong> prompt tool credits / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span><strong>500 AI Searches</strong> / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span><strong>3 Prompt Requests</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">400 saves & history</span>
                    </li>
                  </ul>
                </div>

                <RazorpayCheckoutButton
                  amount={100}
                  planTier="vip"
                  planName={billingCycle === 'monthly' ? 'VIP Monthly' : 'VIP Yearly'}
                  description={billingCycle === 'monthly' ? 'Monthly VIP - 600 Credits, 500 AI Searches' : 'Yearly VIP - 600 Credits/mo, 500 AI Searches/mo'}
                  buttonText="Get VIP for ₹1"
                  variant="secondary"
                  className="w-full text-xs"
                />
              </div>

              {/* Tier 4: Ultra Studio */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 text-white border-2 border-amber-500/80 shadow-xl flex flex-col justify-between space-y-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                  Ultimate Studio
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Crown className="w-6 h-6 fill-amber-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">Studio 499</h3>
                    <p className="text-xs text-neutral-400">Unlimited AI power & maximum quota</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-amber-400">
                      ₹1
                    </span>
                    <span className="text-xs text-neutral-400">
                      {billingCycle === 'monthly' ? '/ month' : '/ year'}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-300">
                    <li className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span className="font-bold text-white">Unlock all premium prompts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span><strong>1500 credits</strong> / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span className="font-bold text-amber-300">Unlimited AI Search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span><strong>5 Prompt Requests</strong> / mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span className="font-bold text-amber-400">Unlimited saves & history</span>
                    </li>
                  </ul>
                </div>

                <RazorpayCheckoutButton
                  amount={100}
                  planTier="ultra"
                  planName={billingCycle === 'monthly' ? 'Studio 499 Monthly' : 'Studio 499 Yearly'}
                  description={billingCycle === 'monthly' ? 'Studio 499 - 1500 Credits, Unlimited AI Search' : 'Yearly Studio 499 - 1500 Credits/mo, Unlimited AI Search'}
                  buttonText="Get Studio for ₹1"
                  variant="dark"
                  className="w-full text-xs font-black bg-amber-500 hover:bg-amber-400 text-black"
                />
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setBillingView('credits')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-[#E60023] transition-colors"
              >
                <span>Prefer pay-as-you-go credits without monthly renewals? View Credits Packs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Features Comparison Table */}
        <div className="max-w-5xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              Compare Plan Features
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Find the exact plan tailored to your creative workflow and production volume.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold">
                  <th className="py-3 px-4">Feature / Benefit</th>
                  <th className="py-3 px-4 text-center">Free</th>
                  <th className="py-3 px-4 text-center">Starter</th>
                  <th className="py-3 px-4 text-center">Pro</th>
                  <th className="py-3 px-4 text-center">VIP</th>
                  <th className="py-3 px-4 text-center text-amber-500">Studio 499</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Price</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600">₹0 Free</td>
                  <td className="py-3.5 px-4 text-center font-black text-neutral-900 dark:text-white">₹1 / mo</td>
                  <td className="py-3.5 px-4 text-center font-black text-[#E60023]">₹1 / mo</td>
                  <td className="py-3.5 px-4 text-center font-black text-purple-600 dark:text-purple-400">₹1 / mo</td>
                  <td className="py-3.5 px-4 text-center font-black text-amber-500">₹1 / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Monthly Tool Credits</td>
                  <td className="py-3.5 px-4 text-center font-medium">5 on signup</td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">100 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">250 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">600 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">1,500 / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">AI Search Quota</td>
                  <td className="py-3.5 px-4 text-center font-medium">5 lifetime</td>
                  <td className="py-3.5 px-4 text-center font-bold">100 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold">200 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold">500 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Custom Prompt Requests</td>
                  <td className="py-3.5 px-4 text-center text-neutral-400"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3.5 px-4 text-center font-bold">1 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold">2 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold">3 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-500">5 / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Saves & History Limit</td>
                  <td className="py-3.5 px-4 text-center font-medium">10 saves</td>
                  <td className="py-3.5 px-4 text-center font-bold">100 saves</td>
                  <td className="py-3.5 px-4 text-center font-bold">200 saves</td>
                  <td className="py-3.5 px-4 text-center font-bold">400 saves</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Unlock All Premium Prompts</td>
                  <td className="py-3.5 px-4 text-center font-medium">1 cr per prompt</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Image-to-Prompt (2 cr each)</td>
                  <td className="py-3.5 px-4 text-center">Up to 2 runs</td>
                  <td className="py-3.5 px-4 text-center font-medium">Up to 50 runs</td>
                  <td className="py-3.5 px-4 text-center font-medium">Up to 125 runs</td>
                  <td className="py-3.5 px-4 text-center font-medium">Up to 300 runs</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-500">Up to 750 runs</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">AI Prompt Generator & Editor (1 cr each)</td>
                  <td className="py-3.5 px-4 text-center">Up to 5 runs</td>
                  <td className="py-3.5 px-4 text-center font-medium">Up to 100 runs</td>
                  <td className="py-3.5 px-4 text-center font-medium">Up to 250 runs</td>
                  <td className="py-3.5 px-4 text-center font-medium">Up to 600 runs</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-500">Up to 1,500 runs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-neutral-500">
                Everything you need to know about plans, payments, and credits
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

        {/* How Credits Work Section */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  How Credits Are Used
                </h2>
                <p className="text-xs text-neutral-500">
                  Transparent, predictable usage across all creative tools
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full w-fit">
              +5 Free Signup Tool Credits for all accounts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                1 Cr
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Unlock Premium Prompts
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  1 credit for free accounts. <strong>Included 100% Free</strong> on all active Starter, Pro, VIP, and Studio plans with zero credit deductions.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/80 text-[#E60023] flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                2 Cr
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#E60023]" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Image-to-Prompt Extraction
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  2 credits per run. Gives up to <strong>50 runs on Starter</strong>, <strong>125 on Pro</strong>, <strong>300 on VIP</strong>, and <strong>750 on Studio 499</strong> each month.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                1 Cr
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    AI Prompt Generator
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  1 credit per prompt generation. Delivers up to <strong>100 gens on Starter</strong>, <strong>250 on Pro</strong>, <strong>600 on VIP</strong>, and <strong>1,500 on Studio 499</strong> per month.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                1 Cr
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Prompt Editor Tool
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  1 credit per remix/edit. Delivers up to <strong>100 edits on Starter</strong>, <strong>250 on Pro</strong>, <strong>600 on VIP</strong>, and <strong>1,500 on Studio 499</strong> per month.
                </p>
              </div>
            </div>
          </div>

          {/* Plan Monthly Deliverables Summary Grid */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
              Monthly Plan Deliverables & Feature Power
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Starter (₹1)</span>
                  <span className="text-amber-500 font-black">100 Cr</span>
                </div>
                <div className="text-[11px] text-neutral-500 space-y-0.5">
                  <p>• 100 Tool Credits / mo</p>
                  <p>• 100 AI Searches / mo</p>
                  <p>• 1 Prompt Request / mo</p>
                  <p>• 100 Saves & History</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-[#E60023] space-y-1.5 shadow-xs">
                <div className="font-bold text-[#E60023] flex items-center justify-between">
                  <span>Pro (₹1)</span>
                  <span className="font-black">250 Cr</span>
                </div>
                <div className="text-[11px] text-neutral-500 space-y-0.5">
                  <p>• 250 Tool Credits / mo</p>
                  <p>• 200 AI Searches / mo</p>
                  <p>• 2 Prompt Requests / mo</p>
                  <p>• 200 Saves & History</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-purple-500/40 space-y-1.5">
                <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                  <span>VIP (₹1)</span>
                  <span className="font-black">600 Cr</span>
                </div>
                <div className="text-[11px] text-neutral-500 space-y-0.5">
                  <p>• 600 Tool Credits / mo</p>
                  <p>• 500 AI Searches / mo</p>
                  <p>• 3 Prompt Requests / mo</p>
                  <p>• 400 Saves & History</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 text-white border border-amber-500/60 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>Studio 499 (₹1)</span>
                  <span className="font-black">1,500 Cr</span>
                </div>
                <div className="text-[11px] text-neutral-300 space-y-0.5">
                  <p>• 1,500 Tool Credits / mo</p>
                  <p>• Unlimited AI Searches</p>
                  <p>• 5 Prompt Requests / mo</p>
                  <p>• Unlimited Saves & History</p>
                </div>
              </div>
            </div>
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
      </main>

      <Footer />
      <BottomNav />
      <RazorpayCheckoutModal />
    </div>
  );
}
