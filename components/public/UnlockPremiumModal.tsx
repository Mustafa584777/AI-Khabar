'use client';

import React, { useState } from 'react';
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
  Coins,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RazorpayCheckoutButton } from './RazorpayCheckoutButton';

export const UnlockPremiumModal: React.FC = () => {
  const router = useRouter();
  const {
    isUnlockPremiumModalOpen,
    setIsUnlockPremiumModalOpen,
    lockedPromptContext,
    applyPlan,
    toolCredits,
    unlockPromptWithCredit,
    addToolCredits,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'credits' | 'plans'>('credits');

  if (!isUnlockPremiumModalOpen) return null;

  const handleGoToPricing = () => {
    setIsUnlockPremiumModalOpen(false);
    router.push('/pricing');
  };

  const handlePlanSuccess = (planName: 'starter' | 'pro' | 'vip') => {
    applyPlan(planName);
    setIsUnlockPremiumModalOpen(false);
  };

  const handleUnlockSinglePromptWithCredit = () => {
    if (!lockedPromptContext) return;
    if (toolCredits >= 1) {
      const res = unlockPromptWithCredit(lockedPromptContext.id);
      if (res.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#E60023'],
          });
        } catch {}
        showToast('Prompt unlocked! 1 credit used 🎉');
        setIsUnlockPremiumModalOpen(false);
      } else {
        showToast(res.message);
      }
    } else {
      showToast(`You need 1 credit to unlock this prompt. Choose a credits pack below!`);
      setActiveTab('credits');
    }
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
            Unlock Premium Prompts
          </h2>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            1 Credit unlocks any premium prompt. Or subscribe monthly for full unlimited access.
          </p>
        </div>

        {/* Locked Prompt Preview + Direct 1-Credit Unlock */}
        {lockedPromptContext && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-amber-50/30 dark:from-neutral-800/60 dark:to-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700 inline-flex items-center gap-1">
                <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                Selected Premium Prompt
              </span>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Balance: <strong className="text-amber-600 dark:text-amber-400">{toolCredits} Credits</strong>
              </span>
            </div>

            <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
              {lockedPromptContext.title}
            </h4>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Cost: <strong className="text-amber-600 dark:text-amber-400">1 Credit</strong> to unlock permanently
              </span>

              <button
                type="button"
                onClick={handleUnlockSinglePromptWithCredit}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5 fill-black" />
                <span>{toolCredits >= 1 ? `Unlock for 1 Credit (${toolCredits} Available)` : 'Unlock for 1 Credit (0 Left)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Toggle: Credits Packs vs Monthly Subscriptions */}
        <div className="flex p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setActiveTab('credits')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'credits'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Credits Packs (Pay As You Go)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-purple-500" />
            <span>Monthly Subscriptions</span>
          </button>
        </div>

        {/* Tab 1: Credits Packs */}
        {activeTab === 'credits' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 100 Credits Pack */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 dark:text-white">100 Credits</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">₹49</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">₹0.49 / credit</div>
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock 100 premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>33 image extractions (3 cr each)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Never expires</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={4900}
                creditsToAdd={100}
                planName="100 Credits Pack"
                description="Instant 100 credits for prompt unlocks & AI studio"
                buttonText="Buy 100 for ₹49"
                variant="secondary"
                size="sm"
                className="w-full text-xs font-bold py-2"
                onSuccess={() => {
                  showToast('100 Credits added to your account! 🎉');
                  setIsUnlockPremiumModalOpen(false);
                }}
              />
            </div>

            {/* 250 Credits Pack (Popular) */}
            <div className="relative p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border-2 border-[#E60023] flex flex-col justify-between space-y-3 shadow-md">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
                Popular
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#E60023] dark:text-red-400">250 Credits</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">₹99</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">₹0.39 / credit • Popular</div>
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock 250 premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>83 image extractions (3 cr each)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Never expires</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={9900}
                creditsToAdd={250}
                planName="250 Credits Pack"
                description="Instant 250 credits for prompt unlocks & AI studio"
                buttonText="Buy 250 for ₹99"
                variant="primary"
                size="sm"
                className="w-full text-xs font-bold py-2"
                onSuccess={() => {
                  showToast('250 Credits added to your account! 🎉');
                  setIsUnlockPremiumModalOpen(false);
                }}
              />
            </div>

            {/* 499 Credits Pack (Best Value) */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">499 Credits</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">₹199</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">₹0.39 / credit • Best Value</div>
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock 499 premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>166 image extractions (3 cr each)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Never expires</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={19900}
                creditsToAdd={499}
                planName="499 Credits Pack"
                description="Instant 499 credits for prompt unlocks & AI studio"
                buttonText="Buy 499 for ₹199"
                variant="dark"
                size="sm"
                className="w-full text-xs font-bold py-2"
                onSuccess={() => {
                  showToast('499 Credits added to your account! 🎉');
                  setIsUnlockPremiumModalOpen(false);
                }}
              />
            </div>
          </div>
        ) : (
          /* Tab 2: Monthly Subscriptions */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Starter Tier */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 dark:text-white">Starter</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">₹49/mo</span>
                </div>
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock all premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>30 tool credits / mo</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Unlimited prompt & history saves</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={4900}
                planName="Starter Plan"
                planTier="starter"
                description="Unlock premium prompts + 30 tool credits + Unlimited saves"
                buttonText="Pay ₹49/mo"
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
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">₹99/mo</span>
                </div>
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock all premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>60 tool credits / mo</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-[#E60023]">Unlimited prompt & history saves</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={9900}
                planName="Pro Plan"
                planTier="pro"
                description="Unlock premium prompts + 60 tool credits + Unlimited saves"
                buttonText="Pay ₹99/mo"
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
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">₹199/mo</span>
                </div>
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlock all premium prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>180 tool credits / mo</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-purple-600 dark:text-purple-400">Unlimited prompt & history saves</span>
                  </li>
                </ul>
              </div>
              <RazorpayCheckoutButton
                amount={19900}
                planName="VIP Plan"
                planTier="vip"
                description="Unlock premium prompts + 180 tool credits + Unlimited saves"
                buttonText="Pay ₹199/mo"
                variant="dark"
                size="sm"
                className="w-full text-xs font-bold py-2"
                onSuccess={() => handlePlanSuccess('vip')}
              />
            </div>
          </div>
        )}

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
