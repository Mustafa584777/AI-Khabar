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
  CreditCard,
  CheckCircle2,
  Terminal,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function CheckoutPage() {
  const { isProUser, setIsProCheckoutModalOpen } = useApp();
  const [testAmount, setTestAmount] = useState<number>(1); // ₹1 = 100 paise
  const [testLogs, setTestLogs] = useState<Array<{ step: string; status: 'pending' | 'success' | 'error'; detail: string }>>([]);

  const handleTestSuccess = (data: any) => {
    setTestLogs((prev) => [
      ...prev,
      {
        step: '3. Backend Signature Verification',
        status: 'success',
        detail: `Verified with HMAC-SHA256! Order: ${data.order_id}, Payment: ${data.payment_id}`,
      },
    ]);
  };

  const handleTestFailure = (err: any) => {
    setTestLogs((prev) => [
      ...prev,
      {
        step: 'Payment / Verification Failed',
        status: 'error',
        detail: err.message || 'Error occurred during transaction',
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors flex flex-col pb-20 sm:pb-8">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-[#E60023] text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Razorpay Standard Web Checkout</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Unlock Full Creative Power with Pro
          </h1>

          <p className="text-xs sm:text-base text-neutral-600 dark:text-neutral-400">
            Support the prompt directory, generate unlimited AI photo prompts with reverse-engineering DNA, and unlock high-res studio downloads.
          </p>

          {isProUser && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>You currently have active PRO Member access on this device!</span>
            </div>
          )}
        </div>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Tier 1: Supporter */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Supporter Pass</h3>
                <p className="text-xs text-neutral-500">Perfect for casual creators & hobbyists</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">₹49</span>
                <span className="text-xs text-neutral-400">/ one-time</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Supporter Profile Badge</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Unlimited Bookmark Collections</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Direct prompt text copies</span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={4900}
              planName="Supporter Pass"
              description="One-time supporter contribution"
              buttonText="Pay ₹49 with Razorpay"
              variant="secondary"
              className="w-full"
            />
          </div>

          {/* Tier 2: Pro Creator (Featured) */}
          <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-[#E60023] shadow-xl shadow-red-500/10 flex flex-col justify-between space-y-6 transform md:-translate-y-2">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#E60023] to-[#ff3b56] text-white text-[11px] font-black uppercase tracking-wider shadow-md">
              Most Popular
            </span>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Pro Creator</h3>
                <p className="text-xs text-neutral-500">For active digital artists & AI creators</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">₹199</span>
                <span className="text-xs text-neutral-400">/ 6 months</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span className="font-bold">Unlimited AI Studio Image Reverses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span>Full Photographic DNA Extraction</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span>High-Resolution Prompt Previews</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E60023] font-bold">✓</span>
                  <span>Exclusive Midjourney v6 & Flux Prompts</span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={19900}
              planName="Pro Creator"
              description="6-Month Pro Creator Access"
              buttonText="Get Pro Creator for ₹199"
              variant="pill"
              size="lg"
              className="w-full"
            />
          </div>

          {/* Tier 3: Studio VIP */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">VIP Studio Lifetime</h3>
                <p className="text-xs text-neutral-500">Commercial usage & lifetime updates</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">₹499</span>
                <span className="text-xs text-neutral-400">/ lifetime</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span className="font-bold">Lifetime Unlimited Studio Access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span>Full Commercial Prompt Rights</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span>Custom Prompt Instruction Tuning</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>
                  <span>Direct Priority Developer Support</span>
                </li>
              </ul>
            </div>

            <RazorpayCheckoutButton
              amount={49900}
              planName="VIP Studio Lifetime"
              description="Lifetime VIP Studio Access"
              buttonText="Get VIP Lifetime for ₹499"
              variant="primary"
              className="w-full"
            />
          </div>
        </div>

        {/* Developer & User Live Testing Console (Minimum 100 paise / ₹1.00) */}
        <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-[#E60023]" />
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Live Razorpay Verification Tester
                </h3>
                <p className="text-xs text-neutral-500">
                  Test backend order creation, frontend modal, and HMAC-SHA256 signature verification.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
              Min 100 paise (₹1.00)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Enter Amount in Rupees (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Translates to {(testAmount * 100).toLocaleString()} paise sent to Razorpay API
              </span>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <RazorpayCheckoutButton
                amount={Math.round(testAmount * 100)}
                planName={`Custom Test (₹${testAmount})`}
                description="Live Razorpay Standard Checkout Test"
                buttonText={`Run Live Test (₹${testAmount})`}
                variant="pill"
                size="md"
                className="w-full"
                onSuccess={handleTestSuccess}
                onFailure={handleTestFailure}
              />
              <button
                type="button"
                onClick={() => setIsProCheckoutModalOpen(true)}
                className="text-xs text-neutral-500 hover:text-[#E60023] transition-colors text-center font-medium"
              >
                Or open full Checkout Modal window →
              </button>
            </div>
          </div>

          {/* Verification Logs */}
          {testLogs.length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-neutral-400 font-sans text-[11px] font-bold">
                <span>Verification Logs</span>
                <button
                  onClick={() => setTestLogs([])}
                  className="hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              </div>

              {testLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span
                    className={`font-bold shrink-0 ${
                      log.status === 'success'
                        ? 'text-emerald-500'
                        : log.status === 'error'
                        ? 'text-red-500'
                        : 'text-amber-500'
                    }`}
                  >
                    {log.status === 'success' ? '✔' : log.status === 'error' ? '✖' : '●'}
                  </span>
                  <div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {log.step}:{' '}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400">{log.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted Payment Methods */}
        <div className="p-6 rounded-3xl bg-neutral-100 dark:bg-neutral-900 text-center space-y-3 max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            All Standard Payment Methods Accepted
          </div>
          <p className="text-xs text-neutral-500">
            UPI (Google Pay, PhonePe, Paytm, BHIM), Credit & Debit Cards (Visa, MasterCard, RuPay, Amex), NetBanking (50+ Indian banks), and digital wallets.
          </p>
        </div>
      </main>

      <Footer />
      <BottomNav />
      <RazorpayCheckoutModal />
    </div>
  );
}
