'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Crown,
  CheckCircle2,
  X,
  ArrowRight,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { RazorpayCheckoutButton } from './RazorpayCheckoutButton';

export const UnlockPremiumModal: React.FC = () => {
  const router = useRouter();
  const {
    isUnlockPremiumModalOpen,
    setIsUnlockPremiumModalOpen,
    lockedPromptContext,
    applyPlan,
    showToast,
  } = useApp();

  if (!isUnlockPremiumModalOpen) return null;

  const handleGoToPricing = () => {
    setIsUnlockPremiumModalOpen(false);
    router.push('/pricing');
  };

  const handlePlanSuccess = () => {
    applyPlan('pro');
    setIsUnlockPremiumModalOpen(false);
    const congratsMsg =
      '🎉 Congratulations! Your Pro Yearly (₹99/year) plan has been activated successfully! All premium prompts are unlocked & 120 credits added.';
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('plan_congrats_message', congratsMsg);
      } catch {}
    }
    showToast(congratsMsg);
    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={() => setIsUnlockPremiumModalOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 sm:p-7 space-y-5 text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsUnlockPremiumModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-500 shadow-sm mx-auto">
            <Crown className="w-6 h-6 fill-amber-500 text-amber-500" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            Unlock All Premium Prompts
          </h2>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            Get full access for 1 entire year at just ₹99/year — includes all benefits & 120 prompt tool credits.
          </p>
        </div>

        {/* Locked Prompt Preview */}
        {lockedPromptContext && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-amber-50/30 dark:from-neutral-800/60 dark:to-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700 inline-flex items-center gap-1">
              <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
              Selected Premium Prompt
            </span>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
              {lockedPromptContext.title}
            </h4>
          </div>
        )}

        {/* Single ₹99/year Plan Card */}
        <div className="relative p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/25 border-2 border-[#E60023] flex flex-col justify-between space-y-4 shadow-md">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
            All-Access Annual Plan
          </span>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-[#E60023] flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">Pro Yearly</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Full 365 days access</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">₹99</span>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400"> / year</span>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
              <span className="font-bold text-neutral-900 dark:text-white">Unlock all premium prompts</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
              <span>
                <strong>120</strong> prompt tool credits (AI Generator, Extractor & Editor)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
              <span className="font-bold text-neutral-900 dark:text-white">AI Search (3 daily smart searches)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
              <span className="font-bold text-[#E60023]">Unlimited saves & history</span>
            </li>
          </ul>

          <RazorpayCheckoutButton
            amount={9900}
            planName="Pro Yearly"
            planTier="pro"
            billingCycle="yearly"
            description="1 Year Pro Access • 120 Credits • AI Search • Unlimited Saves"
            buttonText="Unlock Everything for ₹99 / year"
            variant="primary"
            size="md"
            className="w-full text-xs sm:text-sm font-black py-2.5"
            onSuccess={handlePlanSuccess}
          />
        </div>

        {/* Footer info and link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2 text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px]">Razorpay Secure Checkout (UPI, Cards, NetBanking, Wallets)</span>
          </div>

          <button
            onClick={handleGoToPricing}
            className="inline-flex items-center gap-1.5 font-black text-[#E60023] hover:underline"
          >
            <span>View Full Plan Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
