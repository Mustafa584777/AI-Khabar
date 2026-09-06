'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Sparkles,
  Zap,
  Crown,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { startRazorpayCheckout } from '@/lib/razorpay';

interface PlanOption {
  id: string;
  name: string;
  amountPaise: number; // in paise
  displayPrice: string;
  badge?: string;
  features: string[];
  icon: React.ReactNode;
}

const PLANS: PlanOption[] = [
  {
    id: 'supporter',
    name: 'Supporter Pass',
    amountPaise: 4900, // ₹49
    displayPrice: '₹49',
    features: ['Verified Supporter Badge', 'Unlimited Bookmarks', 'No Download Limits'],
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'pro-creator',
    name: 'Pro Creator',
    amountPaise: 19900, // ₹199
    displayPrice: '₹199',
    badge: 'Most Popular',
    features: [
      'Unlimited High-Res AI Studio Generations',
      'Instant Image-to-Prompt Deconstruction',
      'Exclusive Midjourney & Flux Prompt Stacks',
      'Priority VIP Support',
    ],
    icon: <Zap className="w-5 h-5 text-[#E60023]" />,
  },
  {
    id: 'vip-studio',
    name: 'Studio VIP Lifetime',
    amountPaise: 49900, // ₹499
    displayPrice: '₹499',
    badge: 'Best Value',
    features: [
      'Everything in Pro Creator',
      'Commercial Prompt Licensing',
      'Custom Instructions Engine Unlocked',
      'Early Access to New Generative Models',
    ],
    icon: <Crown className="w-5 h-5 text-purple-500" />,
  },
];

export const RazorpayCheckoutModal: React.FC = () => {
  const { isProCheckoutModalOpen, setIsProCheckoutModalOpen, isProUser, setIsProUser, userAccount, showToast } =
    useApp();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro-creator');
  const [customAmountRupees, setCustomAmountRupees] = useState<string>('1'); // ₹1 = 100 paise minimum
  const [isCustom, setIsCustom] = useState<boolean>(false);
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

  const getEffectiveAmountPaise = (): number => {
    if (isCustom) {
      const parsed = parseFloat(customAmountRupees);
      if (isNaN(parsed) || parsed < 1) return 100;
      return Math.round(parsed * 100);
    }
    const found = PLANS.find((p) => p.id === selectedPlanId);
    return found ? found.amountPaise : 19900;
  };

  const getEffectivePlanName = (): string => {
    if (isCustom) {
      return `Custom Payment (₹${customAmountRupees})`;
    }
    const found = PLANS.find((p) => p.id === selectedPlanId);
    return found ? found.name : 'Pro Creator';
  };

  const handlePayNow = async () => {
    setErrorMessage(null);
    const amountPaise = getEffectiveAmountPaise();

    if (amountPaise < 100) {
      setErrorMessage('Minimum amount is ₹1.00 (100 paise).');
      return;
    }

    setIsProcessing(true);
    const planName = getEffectivePlanName();

    try {
      await startRazorpayCheckout({
        amount: amountPaise,
        currency: 'INR',
        name: 'Trending Copy Paste Photo Prompts',
        description: `${planName} - Pro Membership`,
        receipt: `rcpt_${Date.now()}`,
        prefill: {
          name: userAccount?.name || userAccount?.username || 'Creative Member',
          email: userAccount?.email || 'member@trendprompts.com',
        },
        notes: {
          plan: planName,
          plan_id: isCustom ? 'custom' : selectedPlanId,
        },
        themeColor: '#E60023',
        onSuccess: (data) => {
          setIsProcessing(false);
          setIsProUser(true);
          setPaymentResult({
            success: true,
            orderId: data.order_id,
            paymentId: data.payment_id,
            message: data.message,
          });

          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.55 },
              colors: ['#E60023', '#FFD700', '#00C853', '#7C4DFF'],
            });
          } catch {
            // fallback
          }

          showToast('Payment verified successfully! Welcome to Pro.');
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

  const amountPaise = getEffectiveAmountPaise();
  const displayTotal = (amountPaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      id="razorpay-checkout-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsProCheckoutModalOpen(false);
      }}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-7 space-y-6"
        id="razorpay-checkout-modal-content"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#E60023]">
                <Crown className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Upgrade with Razorpay
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Unlock unlimited AI image prompts, high-res generations, and verified Pro perks.
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

        {/* Success State Screen */}
        {paymentResult && paymentResult.success ? (
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100">
                Payment Verified & Confirmed!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                Your signature has been cryptographically validated on the backend with HMAC-SHA256.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-900/40 text-left text-xs space-y-2 font-mono">
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
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">
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
              Continue with Pro Access
            </button>
          </div>
        ) : (
          <>
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Plan Selector */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Select a Plan or Custom Amount:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = !isCustom && selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setIsCustom(false);
                        setSelectedPlanId(plan.id);
                      }}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#E60023] bg-red-50/50 dark:bg-red-950/20 shadow-md ring-2 ring-red-400/20'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                          {plan.badge}
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="p-1.5 rounded-xl bg-white dark:bg-neutral-800 shadow-xs">
                            {plan.icon}
                          </span>
                          <span className="text-lg font-black text-neutral-900 dark:text-white">
                            {plan.displayPrice}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{plan.name}</h4>
                      </div>

                      <ul className="mt-3 space-y-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                        {plan.features.slice(0, 2).map((feat, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-[#E60023] font-bold">✓</span>
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Custom Amount / Test Payment Toggle */}
              <div
                onClick={() => setIsCustom(true)}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isCustom
                    ? 'border-[#E60023] bg-red-50/50 dark:bg-red-950/20 ring-2 ring-red-400/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 font-bold text-sm">
                    ₹
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      Custom Amount / Test Checkout (Min ₹1.00 / 100 paise)
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      Enter any amount to test Razorpay Standard Checkout
                    </span>
                  </div>
                </div>

                {isCustom ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-bold text-neutral-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={customAmountRupees}
                      onChange={(e) => setCustomAmountRupees(e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E60023]"
                    />
                  </div>
                ) : (
                  <span className="text-xs font-bold text-[#E60023]">Select</span>
                )}
              </div>
            </div>

            {/* Razorpay Trust Badge */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px]">
                  Secured by <strong>Razorpay Standard Web Checkout</strong> (UPI, Cards, NetBanking, Wallets)
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Live Mode</span>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E60023] via-[#ff3b56] to-[#E60023] hover:from-red-700 hover:to-red-600 text-white font-black text-sm sm:text-base shadow-xl shadow-red-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              id="razorpay-modal-pay-now-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Pay {displayTotal} with Razorpay</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
