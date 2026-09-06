'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Crown,
  Lock,
  Sparkles,
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

  const handlePlanSuccess = (planName: 'starter' | 'pro' | 'vip') => {
    applyPlan(planName);
    setIsUnlockPremiumModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={() => setIsUnlockPremiumModalOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 sm:p-8 space-y-6 text-neutral-900 dark:text-neutral-100"
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
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-500 shadow-sm mx-auto">
            <Crown className="w-7 h-7 fill-amber-500 text-amber-500" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            Unlock Premium Prompts
          </h2>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
            This prompt is an exclusive high-performance asset. Choose a plan to reveal the full prompt, copy with 1 click, and get tool generation credits.
          </p>
        </div>

        {/* Locked Prompt Preview (If Available) */}
        {lockedPromptContext && (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                Premium Exclusive
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                {lockedPromptContext.category}
              </span>
            </div>

            <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
              {lockedPromptContext.title}
            </h4>

            {/* Blurred Mock Content with Lock Overlay */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-neutral-900 p-3 border border-neutral-200 dark:border-neutral-700/50">
              <p className="text-xs font-mono text-neutral-400 dark:text-neutral-500 blur-sm select-none">
                {lockedPromptContext.promptText.slice(0, 160)}...
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-neutral-900/60 backdrop-blur-[2px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-white/95 dark:bg-neutral-800/95 px-3 py-1 rounded-full shadow-sm border border-neutral-200 dark:border-neutral-700">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Prompt Hidden • Unlock Below</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3 Tier Plans Quick Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Starter Tier */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-neutral-900 dark:text-white">Starter</span>
                <span className="text-xs text-neutral-500">₹49/mo</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlock premium prompts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>10 prompt tools credits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>1 prompt request</span>
                </li>
              </ul>
            </div>
            <RazorpayCheckoutButton
              amount={4900}
              planName="Starter Plan"
              description="Unlock premium prompts + 10 tool credits + 1 request"
              buttonText="Pay ₹49"
              variant="secondary"
              size="sm"
              className="w-full text-xs font-bold py-2"
              onSuccess={() => handlePlanSuccess('starter')}
            />
          </div>

          {/* Pro Tier (Featured) */}
          <div className="relative p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border-2 border-[#E60023] flex flex-col justify-between space-y-3 shadow-md">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
              Popular
            </span>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#E60023] dark:text-red-400">Pro</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">₹199/mo</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlock premium prompts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>50 prompt tools credits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>3 prompt requests</span>
                </li>
              </ul>
            </div>
            <RazorpayCheckoutButton
              amount={19900}
              planName="Pro Plan"
              description="Unlock premium prompts + 50 tool credits + 3 requests"
              buttonText="Pay ₹199"
              variant="primary"
              size="sm"
              className="w-full text-xs font-bold py-2"
              onSuccess={() => handlePlanSuccess('pro')}
            />
          </div>

          {/* VIP Tier */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">VIP</span>
                <span className="text-xs text-neutral-500">₹499/mo</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlock premium prompts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>200 prompt tools credits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>10 prompt requests</span>
                </li>
              </ul>
            </div>
            <RazorpayCheckoutButton
              amount={49900}
              planName="VIP Plan"
              description="Unlock premium prompts + 200 tool credits + 10 requests"
              buttonText="Pay ₹499"
              variant="dark"
              size="sm"
              className="w-full text-xs font-bold py-2"
              onSuccess={() => handlePlanSuccess('vip')}
            />
          </div>
        </div>

        {/* Footer Link to Dedicated Pricing Page */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Official Razorpay Secure Checkout (UPI, Cards, NetBanking)</span>
          </div>

          <button
            onClick={handleGoToPricing}
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#E60023] hover:underline"
          >
            <span>View Full Pricing Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
