'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ShieldCheck,
  Zap,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';
import { useApp } from '@/context/AppContext';
import { startRazorpayCheckout } from '@/lib/razorpay';
import { startRouteNavigation } from '@/lib/navigation';

const SINGLE_YEARLY_PLAN = {
  id: 'pro' as const,
  name: 'Pro Yearly',
  amountPaise: 9900,
  displayPrice: '₹99',
  period: '/ year',
  badge: 'All-Access Annual Pass',
  features: [
    'Unlock all premium prompts',
    'No watermark text on copied prompts',
    '120 prompt tool credits',
    'AI Search (3 daily searches)',
    'Unlimited saves & history',
    'Valid for 1 full year (365 days)',
  ],
};

export const RazorpayCheckoutModal: React.FC = () => {
  const router = useRouter();
  const {
    isProCheckoutModalOpen,
    setIsProCheckoutModalOpen,
    upgradePlan,
    toolCredits,
    userAccount,
    showToast,
    openAuthModal,
  } = useApp();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    orderId?: string;
    paymentId?: string;
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProCheckoutModalOpen) {
        setIsProCheckoutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProCheckoutModalOpen, setIsProCheckoutModalOpen]);

  if (!isProCheckoutModalOpen) return null;

  const handlePayNow = async () => {
    setErrorMessage(null);

    if (!userAccount || !userAccount.isLoggedIn) {
      setIsProCheckoutModalOpen(false);
      openAuthModal('Please sign in or create an account first so your subscription plan is safely saved.');
      return;
    }

    const amountPaise = SINGLE_YEARLY_PLAN.amountPaise;
    setIsProcessing(true);

    try {
      await startRazorpayCheckout({
        amount: amountPaise,
        currency: 'INR',
        name: 'Trending Copy Paste Photo Prompts',
        description: 'Pro Yearly Membership (₹99/year) - All Benefits + 120 Credits',
        receipt: `rcpt_${Date.now()}`,
        prefill: {
          name: userAccount.name || userAccount.username || userAccount.email.split('@')[0],
          email: userAccount.email,
        },
        notes: {
          item: 'Pro Yearly',
          plan: 'Pro Yearly',
          type: 'subscription',
          planTier: 'pro',
          tier: 'pro',
          billingCycle: 'yearly',
          userEmail: userAccount.email,
          userId: userAccount.id,
        },
        themeColor: '#E60023',
        onSuccess: (data) => {
          setIsProcessing(false);
          const isQueued = Boolean(data?.isQueued);
          upgradePlan('pro', data.userSyncData, isQueued, 'yearly');
          const congratsMsg = isQueued
            ? (data?.message || '🎉 Congratulations! Your Pro Yearly plan is queued and will activate once your current plan ends!')
            : '🎉 Congratulations! Your Pro Yearly (₹99/year) plan has been activated successfully! All premium prompts are unlocked & 120 credits added.';

          showToast(congratsMsg);

          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('plan_congrats_message', congratsMsg);
            } catch {}
          }

          setPaymentResult({
            success: true,
            orderId: data.order_id,
            paymentId: data.payment_id,
            message: data.message || 'Successfully processed Pro Yearly (₹99/year) plan.',
          });

          void triggerConfetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#E60023', '#FFD700', '#00C853', '#7C4DFF'],
          });

          setTimeout(() => {
            setIsProCheckoutModalOpen(false);
            startRouteNavigation('/dashboard', 'Loading Creator Dashboard...');
            router.push('/dashboard');
          }, 800);
        },
        onFailure: (err) => {
          setIsProcessing(false);
          setErrorMessage(err.message || 'Payment could not be completed');
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to initialize checkout');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => !isProcessing && setIsProCheckoutModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#E60023]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Pro Yearly Membership
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Current Balance: <strong className="text-amber-600 dark:text-amber-400">{toolCredits} Credits</strong>
            </p>
          </div>

          <button
            onClick={() => setIsProCheckoutModalOpen(false)}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Close"
            id="close-razorpay-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {paymentResult && paymentResult.success ? (
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center space-y-4 animate-scale-up">
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100">
                Payment Verified & Confirmed!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {paymentResult.message}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-900/40 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                <span>Order ID:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{paymentResult.orderId}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                <span>Payment ID:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{paymentResult.paymentId}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                <span>Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                  PAID & VERIFIED
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setPaymentResult(null);
                setIsProCheckoutModalOpen(false);
              }}
              className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              Continue Creating
            </button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Single Annual Plan Card */}
            <div className="p-5 rounded-2xl border-2 border-[#E60023] bg-red-50/40 dark:bg-red-950/20 space-y-4 relative shadow-xs">
              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wide">
                {SINGLE_YEARLY_PLAN.badge}
              </span>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-[#E60023] flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-neutral-900 dark:text-white">
                      {SINGLE_YEARLY_PLAN.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Full Year Membership • 365 Days
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    {SINGLE_YEARLY_PLAN.displayPrice}
                  </span>
                  <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1">
                    {SINGLE_YEARLY_PLAN.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300 pt-1 border-t border-red-200/60 dark:border-red-900/40">
                {SINGLE_YEARLY_PLAN.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0" />
                    <span className="font-semibold">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Security note */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px]">
                  Instant access to all premium prompts & unlimited saves
                </span>
              </div>
              <span className="text-[10px] font-bold text-neutral-400">UPI / Cards</span>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E60023] via-[#ff3b56] to-[#E60023] hover:from-red-700 hover:to-red-600 text-white font-black text-sm shadow-xl shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              id="razorpay-modal-pay-now-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹99 / year with Razorpay</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
