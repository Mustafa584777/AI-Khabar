'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, Gift, CheckCircle2, Zap, X } from 'lucide-react';

export const FirstLoginBonusModal: React.FC = () => {
  const { isFirstLoginModalOpen, setIsFirstLoginModalOpen, toolCredits, userAccount } = useApp();

  if (!isFirstLoginModalOpen) return null;

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_first_login_claimed', 'true');
      if (userAccount?.email) {
        localStorage.setItem(`auraprompt_signup_bonus_claimed_${userAccount.email.toLowerCase().trim()}`, 'true');
      }
    }
    setIsFirstLoginModalOpen(false);
  };

  const displayCredits = Math.max(toolCredits, 5);

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto mb-5 shadow-inner border border-red-100 dark:border-red-900/50">
          <Gift className="w-8 h-8 animate-bounce" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-200 dark:border-emerald-900">
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Member Welcome Gift</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mb-2">
          5 Free Credits Added! 🎉
        </h3>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
          Welcome to Trending Prompts Studio! Aapke is account me <strong className="text-neutral-900 dark:text-white font-bold">5 Free Credits</strong> successfully add kar diye gaye hain to help you unlock premium prompts and generate AI prompts instantly.
        </p>

        <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-amber-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Your Starting Balance</p>
              <p className="text-base font-black text-neutral-900 dark:text-white">{displayCredits} Credits Available</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" /> Credited
          </span>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#E60023] hover:bg-[#cc001f] text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all transform active:scale-[0.98]"
        >
          Start Exploring & Using Prompts
        </button>
      </div>
    </div>
  );
};
