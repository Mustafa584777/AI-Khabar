'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Crown,
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

  const [modalBillingCycle, setModalBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

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
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 sm:p-7 space-y-5 text-neutral-900 dark:text-neutral-100"
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
            Subscribe to any paid plan to instantly unlock all premium prompts, unlimited saves & history, and recurring tool credits.
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

        {/* Monthly / Yearly Billing Toggle */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[11px] font-bold shadow-inner">
              <button
                type="button"
                onClick={() => setModalBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  modalBillingCycle === 'monthly'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setModalBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  modalBillingCycle === 'yearly'
                    ? 'bg-white dark:bg-neutral-900 text-[#E60023] dark:text-red-400 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>Yearly Billing</span>
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[#E60023] text-[9px] font-black uppercase tracking-wide">
                  Save ~20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Starter Tier */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-2.5 hover:border-amber-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 dark:text-white">Starter</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {modalBillingCycle === 'monthly' ? '₹49/mo' : '₹490/yr'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock all premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>100 credits / mo</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Unlimited saves</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={modalBillingCycle === 'monthly' ? 4900 : 49000}
                planName={modalBillingCycle === 'monthly' ? 'Starter Monthly' : 'Starter Yearly'}
                planTier="starter"
                billingCycle={modalBillingCycle}
                description={modalBillingCycle === 'monthly' ? 'Unlock premium + 100 credits + Unlimited saves' : 'Yearly Starter - 1200 credits + Unlimited saves upfront'}
                buttonText={modalBillingCycle === 'monthly' ? 'Pay ₹49/mo' : 'Pay ₹490/yr'}
                variant="secondary"
                size="sm"
                className="w-full text-xs font-bold py-1.5"
                onSuccess={() => handlePlanSuccess('starter')}
              />
            </div>

            {/* Pro Tier (Featured) */}
            <div className="relative p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border-2 border-[#E60023] flex flex-col justify-between space-y-2.5 shadow-md">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
                Popular
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#E60023] dark:text-red-400">Pro</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {modalBillingCycle === 'monthly' ? '₹99/mo' : '₹990/yr'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock all premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>250 credits / mo</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-[#E60023]">Unlimited saves</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={modalBillingCycle === 'monthly' ? 9900 : 99000}
                planName={modalBillingCycle === 'monthly' ? 'Pro Monthly' : 'Pro Yearly'}
                planTier="pro"
                billingCycle={modalBillingCycle}
                description={modalBillingCycle === 'monthly' ? 'Unlock premium + 250 credits + Unlimited saves' : 'Yearly Pro - 3000 credits + Unlimited saves upfront'}
                buttonText={modalBillingCycle === 'monthly' ? 'Pay ₹99/mo' : 'Pay ₹990/yr'}
                variant="primary"
                size="sm"
                className="w-full text-xs font-bold py-1.5"
                onSuccess={() => handlePlanSuccess('pro')}
              />
            </div>

            {/* VIP Tier */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-2.5 hover:border-amber-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">VIP</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {modalBillingCycle === 'monthly' ? '₹199/mo' : '₹1,990/yr'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock all premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>600 credits / mo</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-purple-600 dark:text-purple-400">Unlimited saves</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={modalBillingCycle === 'monthly' ? 19900 : 199000}
                planName={modalBillingCycle === 'monthly' ? 'VIP Monthly' : 'VIP Yearly'}
                planTier="vip"
                billingCycle={modalBillingCycle}
                description={modalBillingCycle === 'monthly' ? 'Unlock premium + 600 credits + Unlimited saves' : 'Yearly VIP - 7200 credits + Unlimited saves upfront'}
                buttonText={modalBillingCycle === 'monthly' ? 'Pay ₹199/mo' : 'Pay ₹1,990/yr'}
                variant="secondary"
                size="sm"
                className="w-full text-xs font-bold py-1.5"
                onSuccess={() => handlePlanSuccess('vip')}
              />
            </div>
          </div>
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
            <span>View Full Pricing Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
