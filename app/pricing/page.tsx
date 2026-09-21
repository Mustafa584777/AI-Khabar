'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Zap, Check, ShieldCheck, ArrowLeft, Crown, Layers, Search, Cpu } from 'lucide-react';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </Link>
          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border border-rose-200 dark:border-rose-900/50">
            <Sparkles className="w-3.5 h-3.5" />
            Flexible Credit & Pro Plans
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white">
            Simple, Transparent Pricing for Creators
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Unlock elite AI prompts, power AI generation tools with credits, and scale your creative workflow with our monthly plans.
          </p>

          {/* Credit rules overview banner */}
          <div className="mt-8 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Free Starter</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Every new user gets 5 free credits upon joining.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Tool Credit Costs</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Prompt Generator/Editor = 1 Credit. Image-to-Prompt = 2 Credits.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Prompt Unlocks</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Unlock any premium prompt permanently for just 1 credit.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="max-w-7xl mx-auto mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Monthly Subscription Plans</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Get monthly tool credits, AI semantic searches, prompt requests, and all prompts unlocked.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* Plan 1: Starter (₹49) */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between relative hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Starter</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">Basic</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-neutral-900 dark:text-white">₹49</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold ml-1">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-neutral-600 dark:text-neutral-300 mb-8">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>60 Credits</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>100 AI Searches</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>50 Prompt Saves</strong> limit</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>All Premium Prompts Unlocked</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>1 Monthly Prompt Request</strong></span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => alert('Redirecting to secure Razorpay checkout for Starter Plan (₹49)...')}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm transition-all shadow-sm"
            >
              Get Started
            </button>
          </div>

          {/* Plan 2: Pro (₹99) */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border-2 border-[#E60023] shadow-md flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              Most Popular
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-[#E60023]">Pro Creator</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">Value</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-neutral-900 dark:text-white">₹99</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold ml-1">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-neutral-600 dark:text-neutral-300 mb-8">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>130 Credits</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>250 AI Searches</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>100 Prompt Saves</strong> limit</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>All Premium Prompts Unlocked</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>2 Monthly Prompt Requests</strong></span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => alert('Redirecting to secure Razorpay checkout for Pro Plan (₹99)...')}
              className="w-full py-3 px-4 rounded-xl bg-[#E60023] hover:bg-[#d00020] text-white font-bold text-sm transition-all shadow-sm"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Plan 3: VIP (₹199) */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between relative hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">VIP Pro</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">Power</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-neutral-900 dark:text-white">₹199</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold ml-1">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-neutral-600 dark:text-neutral-300 mb-8">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>275 Credits</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>600 AI Searches</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>200 Prompt Saves</strong> limit</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>All Premium Prompts Unlocked</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>3 Monthly Prompt Requests</strong></span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => alert('Redirecting to secure Razorpay checkout for VIP Plan (₹199)...')}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm transition-all shadow-sm"
            >
              Get VIP
            </button>
          </div>

          {/* Plan 4: Ultimate / Studio (₹499 - NEW PLAN) */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 dark:from-neutral-900 dark:to-black text-white rounded-3xl p-6 border border-neutral-800 shadow-xl flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              Ultimate Studio
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Enterprise</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">Unlimited</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">₹499</span>
                <span className="text-xs text-neutral-400 font-semibold ml-1">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-neutral-300 mb-8">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>1500 Credits</strong> / month</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Unlimited AI Searches</strong></span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Unlimited Saves & History</strong></span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>All Premium Prompts Unlocked</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>10 Monthly Prompt Requests</strong></span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => alert('Redirecting to secure Razorpay checkout for Ultimate Plan (₹499)...')}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm transition-all shadow-sm"
            >
              Get Ultimate Studio
            </button>
          </div>
        </div>
      </div>

      {/* One-Time Credit Top-Up Packs */}
      <div className="max-w-5xl mx-auto mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white">One-Time Credit Top-Up Packs</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Need extra credits without a monthly commitment? Top up anytime. Credits never expire.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 text-center shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Starter Pack</span>
              <div className="text-3xl font-black text-neutral-900 dark:text-white my-3">120 Credits</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-semibold mb-6">₹49 <span className="text-xs font-normal text-neutral-500">one-time</span></p>
            </div>
            <button
              onClick={() => alert('Top up 120 credits for ₹49')}
              className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-bold text-sm transition-all"
            >
              Buy 120 Credits
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border-2 border-amber-500 text-center shadow-sm flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
              Best Seller
            </div>
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Creator Pack</span>
              <div className="text-3xl font-black text-neutral-900 dark:text-white my-3">260 Credits</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-semibold mb-6">₹99 <span className="text-xs font-normal text-neutral-500">one-time</span></p>
            </div>
            <button
              onClick={() => alert('Top up 260 credits for ₹99')}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition-all shadow-sm"
            >
              Buy 260 Credits
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 text-center shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Mega Pack</span>
              <div className="text-3xl font-black text-neutral-900 dark:text-white my-3">550 Credits</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-semibold mb-6">₹199 <span className="text-xs font-normal text-neutral-500">one-time</span></p>
            </div>
            <button
              onClick={() => alert('Top up 550 credits for ₹199')}
              className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-bold text-sm transition-all"
            >
              Buy 550 Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
