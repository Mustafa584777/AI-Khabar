'use client';

import React, { useState, useEffect } from 'react';
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
  Clock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatExpiryDateWithHour } from '@/lib/plans';

const FAQS = [
  {
    question: 'How do subscription plans work?',
    answer: 'Subscribe to Starter, Pro, or VIP on a monthly or yearly billing cycle to unlock all premium prompts instantly and receive recurring tool credits, AI search quotas, and unlimited saves & history.',
  },
  {
    question: 'Can I cancel, upgrade or downgrade my plan?',
    answer: 'Plans cannot be cancelled once active, but you can upgrade or downgrade at any time. When you purchase a new plan while your current plan is still active, the new plan is safely queued and automatically starts immediately after your existing plan expires.',
  },
  {
    question: 'What happens to my saved data after my plan expires?',
    answer: 'Your saved prompts, history, and unlocked items are 100% safe and never deleted when a plan expires. Your account simply demotes to the free tier, and your existing saves remain fully intact.',
  },
  {
    question: 'What payment methods are supported via Razorpay?',
    answer: 'We accept all major Indian and international payment methods via secure Razorpay checkout, including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards (Visa, MasterCard, RuPay), NetBanking, and Wallets.',
  },
  {
    question: 'What is AI Search and how does it work?',
    answer: 'AI Search allows you to search across thousands of curated visual prompts using natural conversational queries. Paid plans include generous AI Search quotas ranging from 100 searches up to 500 per month.',
  },
  {
    question: 'Are premium prompts unlocked with subscriptions?',
    answer: 'Yes! All active subscription plans (Starter, Pro, and VIP) give you 100% free, unlimited access to unlock all premium prompts instantly without using any tool credits.',
  },
];

export default function CheckoutPage() {
  const { isProUser, planTier, toolCredits, planExpiresAt, queuedPlan } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date('2026-11-10T23:59:59').getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };
    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Diwali Special Offer Banner */}
        <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 text-2xl">
              🪔
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                ✨ Mega Diwali Festival Special Offer — 50% OFF All Plans! ✨
              </h2>
              <p className="text-xs text-amber-100">
                Celebrate Diwali with premium AI prompts at half price. Limited time offer valid until November 10!
              </p>
            </div>
          </div>
          {/* Countdown Timer */}
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-xs font-bold">
            <div className="flex flex-col items-center px-1.5">
              <span className="text-base font-black">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="text-[9px] uppercase tracking-wider text-amber-200">Days</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center px-1.5">
              <span className="text-base font-black">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[9px] uppercase tracking-wider text-amber-200">Hours</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center px-1.5">
              <span className="text-base font-black">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[9px] uppercase tracking-wider text-amber-200">Mins</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center px-1.5">
              <span className="text-base font-black">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[9px] uppercase tracking-wider text-amber-200">Secs</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-[#E60023] text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Razorpay Standard Web Checkout</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Subscription Plans for Every Creator
          </h1>

          <p className="text-xs sm:text-base text-neutral-600 dark:text-neutral-400">
            Subscribe monthly or yearly to unlock all premium prompts, enjoy unlimited saves & history, and get recurring tool credits.
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
                  {(planTier || 'Pro').toUpperCase()} Plan {planExpiresAt ? `(Expires ${formatExpiryDateWithHour(planExpiresAt)})` : ''}
                </span>
              </>
            )}
            {queuedPlan && (
              <>
                <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Clock className="w-3.5 h-3.5" />
                  Upcoming: {queuedPlan.planName?.toUpperCase() || queuedPlan.planTier.toUpperCase()} Scheduled
                </span>
              </>
            )}
          </div>

          {isProUser && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium">
              💡 <strong>Active Plan Protection:</strong> Any new plan you choose will start automatically on your expiry date at 11:59 PM.
            </p>
          )}

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg transition-all ${
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
                className={`px-6 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-white dark:bg-neutral-900 text-[#E60023] dark:text-red-400 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>Yearly Billing</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Plans Grid (Starter, Pro, VIP) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Tier 1: Starter */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Starter</h3>
                <p className="text-xs text-neutral-500">
                  {billingCycle === 'yearly' ? 'Combined annual membership' : 'Essential membership'}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900 dark:text-white">
                  {billingCycle === 'monthly' ? '₹24.5' : '₹245'}
                </span>
                <span className="text-xs text-neutral-400">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlock all premium prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>
                    <strong>{billingCycle === 'yearly' ? '1,200' : '100'}</strong> prompt tool credits {billingCycle === 'yearly' ? 'upfront' : '/ mo'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>
                    <strong>{billingCycle === 'yearly' ? '1,200 AI Searches' : '100 AI Searches'}</strong> {billingCycle === 'yearly' ? '/ year' : '/ mo'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Unlimited saves & history
                  </span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={billingCycle === 'monthly' ? 2450 : 24500}
              planTier="starter"
              billingCycle={billingCycle}
              planName={billingCycle === 'monthly' ? 'Starter Monthly' : 'Starter Yearly'}
              description={
                billingCycle === 'monthly'
                  ? 'Monthly Starter - 100 Credits, 100 AI Searches, Unlimited Saves'
                  : 'Yearly Starter - 1200 Credits, 1200 AI Searches, Unlimited Saves upfront'
              }
              buttonText={billingCycle === 'monthly' ? 'Get Starter for ₹24.5' : 'Get Starter Yearly for ₹245'}
              variant="secondary"
              className="w-full text-xs"
            />
          </div>

          {/* Tier 2: Pro */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-[#E60023] shadow-lg flex flex-col justify-between space-y-6 relative hover:shadow-xl transition-shadow">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
              {billingCycle === 'yearly' ? 'Best Annual Value' : 'Most Popular'}
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Pro</h3>
                <p className="text-xs text-neutral-500">
                  {billingCycle === 'yearly' ? '3,000 Combined Credits for full year' : 'For active creators & prompt engineers'}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900 dark:text-white">
                  {billingCycle === 'monthly' ? '₹49.5' : '₹495'}
                </span>
                <span className="text-xs text-neutral-400">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlock all premium prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span>
                    <strong>{billingCycle === 'yearly' ? '3,000' : '250'}</strong> prompt tool credits {billingCycle === 'yearly' ? 'upfront' : '/ mo'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span>
                    <strong>{billingCycle === 'yearly' ? '2,400 AI Searches' : '200 AI Searches'}</strong> {billingCycle === 'yearly' ? '/ year' : '/ mo'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span className="font-bold text-[#E60023]">
                    Unlimited saves & history
                  </span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={billingCycle === 'monthly' ? 4950 : 49500}
              planTier="pro"
              billingCycle={billingCycle}
              planName={billingCycle === 'monthly' ? 'Pro Monthly' : 'Pro Yearly'}
              description={
                billingCycle === 'monthly'
                  ? 'Monthly Pro - 250 Credits, 200 AI Searches, Unlimited Saves'
                  : 'Yearly Pro - 3000 Credits, 2400 AI Searches, Unlimited Saves upfront'
              }
              buttonText={billingCycle === 'monthly' ? 'Get Pro for ₹49.5' : 'Get Pro Yearly for ₹495'}
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
                <p className="text-xs text-neutral-500">
                  {billingCycle === 'yearly' ? '7,200 Combined Credits for studios' : 'Power creators & studios'}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900 dark:text-white">
                  {billingCycle === 'monthly' ? '₹99.5' : '₹995'}
                </span>
                <span className="text-xs text-neutral-400">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span className="font-bold text-neutral-900 dark:text-white">Unlock all premium prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span>
                    <strong>{billingCycle === 'yearly' ? '7,200' : '600'}</strong> prompt tool credits {billingCycle === 'yearly' ? 'upfront' : '/ mo'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span>
                    <strong>{billingCycle === 'yearly' ? '6,000 AI Searches' : '500 AI Searches'}</strong> {billingCycle === 'yearly' ? '/ year' : '/ mo'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    Unlimited saves & history
                  </span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={billingCycle === 'monthly' ? 9950 : 99500}
              planTier="vip"
              billingCycle={billingCycle}
              planName={billingCycle === 'monthly' ? 'VIP Monthly' : 'VIP Yearly'}
              description={
                billingCycle === 'monthly'
                  ? 'Monthly VIP - 600 Credits, 500 AI Searches, Unlimited Saves'
                  : 'Yearly VIP - 7200 Credits, 6000 AI Searches, Unlimited Saves upfront'
              }
              buttonText={billingCycle === 'monthly' ? 'Get VIP for ₹99.5' : 'Get VIP Yearly for ₹995'}
              variant="secondary"
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Features Comparison Table */}
        <div className="max-w-5xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              Compare Plan Features
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Find the exact subscription plan tailored to your creative workflow.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Price</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600">₹0 Free</td>
                  <td className="py-3.5 px-4 text-center font-black text-neutral-900 dark:text-white">
                    {billingCycle === 'monthly' ? '₹24.5 / mo' : '₹245 / year'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-black text-[#E60023]">
                    {billingCycle === 'monthly' ? '₹49.5 / mo' : '₹495 / year'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-black text-purple-600 dark:text-purple-400">
                    {billingCycle === 'monthly' ? '₹99.5 / mo' : '₹995 / year'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                    {billingCycle === 'monthly' ? 'Monthly Tool Credits' : 'Total Combined Credits'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium">5 Lifetime</td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">
                    {billingCycle === 'monthly' ? '100 / mo' : '1,200 upfront'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">
                    {billingCycle === 'monthly' ? '250 / mo' : '3,000 upfront'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">
                    {billingCycle === 'monthly' ? '600 / mo' : '7,200 upfront'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                    {billingCycle === 'monthly' ? 'AI Search Quota' : 'Total AI Searches'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium">5 lifetime</td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    {billingCycle === 'monthly' ? '100 / mo' : '1,200 / yr'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    {billingCycle === 'monthly' ? '200 / mo' : '2,400 / yr'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    {billingCycle === 'monthly' ? '500 / mo' : '6,000 / yr'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Saves & History Limit</td>
                  <td className="py-3.5 px-4 text-center font-medium">10 saves</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">Unlock All Premium Prompts</td>
                  <td className="py-3.5 px-4 text-center font-medium">Paid Sub Only</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto inline mr-1" /> All Unlocked</td>
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
                Everything you need to know about plans and subscriptions
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
      </main>

      <Footer />
      <BottomNav />
      <RazorpayCheckoutModal />
    </div>
  );
}
