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
  Coins,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { startRazorpayCheckout } from '@/lib/razorpay';

interface PlanOption {
  id: 'starter' | 'pro' | 'vip';
  name: string;
  amountPaise: number;
  displayPrice: string;
  period: string;
  badge?: string;
  features: string[];
  icon: React.ReactNode;
}

const SUBSCRIPTION_PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    amountPaise: 4900,
    displayPrice: '₹49',
    period: '/ month',
    features: ['Unlock all premium prompts', '100 prompt tools credits', 'Unlimited prompt & history saves'],
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'pro',
    name: 'Pro',
    amountPaise: 9900,
    displayPrice: '₹99',
    period: '/ month',
    badge: 'Most Popular',
    features: ['Unlock all premium prompts', '250 prompt tools credits', 'Unlimited prompt & history saves', 'Priority fast-lane'],
    icon: <Zap className="w-5 h-5 text-[#E60023]" />,
  },
  {
    id: 'vip',
    name: 'VIP',
    amountPaise: 19900,
    displayPrice: '₹199',
    period: '/ month',
    badge: 'Best Value',
    features: ['Unlock all premium prompts', '500 prompt tools credits', 'Unlimited prompt & history saves', 'VIP 1-on-1 priority support'],
    icon: <Crown className="w-5 h-5 text-purple-500" />,
  },
];

interface CreditPackOption {
  id: string;
  name: string;
  credits: number;
  amountPaise: number;
  displayPrice: string;
  badge?: string;
  rateText: string;
  features: string[];
  icon: React.ReactNode;
}

const CREDIT_PACK_OPTIONS: CreditPackOption[] = [
  {
    id: 'pack-100',
    name: '100 Credits',
    credits: 100,
    amountPaise: 4900,
    displayPrice: '₹49',
    rateText: '₹0.49/cr',
    badge: undefined,
    features: ['Unlock 100 prompts', 'Up to 33 image runs', 'Never expires'],
    icon: <Coins className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'pack-250',
    name: '250 Credits',
    credits: 250,
    amountPaise: 9900,
    displayPrice: '₹99',
    rateText: '₹0.39/cr',
    badge: 'Popular',
    features: ['Unlock 250 prompts', 'Up to 83 image runs', 'Never expires'],
    icon: <Zap className="w-5 h-5 text-[#E60023]" />,
  },
  {
    id: 'pack-499',
    name: '499 Credits',
    credits: 499,
    amountPaise: 19900,
    displayPrice: '₹199',
    rateText: '₹0.39/cr',
    badge: 'Best Value',
    features: ['Unlock 499 prompts', 'Up to 166 image runs', 'Never expires'],
    icon: <Crown className="w-5 h-5 text-purple-500" />,
  },
];

export const RazorpayCheckoutModal: React.FC = () => {
  const {
    isProCheckoutModalOpen,
    setIsProCheckoutModalOpen,
    setIsProUser,
    upgradePlan,
    addToolCredits,
    toolCredits,
    userAccount,
    showToast,
  } = useApp();

  const [checkoutType, setCheckoutType] = useState<'credits' | 'subscription'>('credits');
  const [selectedCreditPackId, setSelectedCreditPackId] = useState<string>('pack-250');
  const [selectedPlanId, setSelectedPlanId] = useState<'starter' | 'pro' | 'vip'>('pro');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    orderId?: string;
    paymentId?: string;
    creditsAdded?: number;
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
    if (checkoutType === 'credits') {
      const pack = CREDIT_PACK_OPTIONS.find((p) => p.id === selectedCreditPackId);
      return pack ? pack.amountPaise : 9900;
    }
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId);
    return plan ? plan.amountPaise : 19900;
  };

  const getEffectiveTitle = (): string => {
    if (checkoutType === 'credits') {
      const pack = CREDIT_PACK_OPTIONS.find((p) => p.id === selectedCreditPackId);
      return pack ? `${pack.name} Pack` : 'Credits Pack';
    }
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId);
    return plan ? `${plan.name} Membership` : 'Pro Membership';
  };

  const handlePayNow = async () => {
    setErrorMessage(null);
    const amountPaise = getEffectiveAmountPaise();

    if (amountPaise < 100) {
      setErrorMessage('Minimum amount is ₹1.00 (100 paise).');
      return;
    }

    setIsProcessing(true);
    const itemTitle = getEffectiveTitle();
    const isCreditPack = checkoutType === 'credits';
    const selectedPack = isCreditPack ? CREDIT_PACK_OPTIONS.find((p) => p.id === selectedCreditPackId) : null;

    try {
      await startRazorpayCheckout({
        amount: amountPaise,
        currency: 'INR',
        name: 'Trending Copy Paste Photo Prompts',
        description: `${itemTitle} - Instant Access`,
        receipt: `rcpt_${Date.now()}`,
        prefill: {
          name: userAccount?.name || userAccount?.username || 'Creative Member',
          email: userAccount?.email || 'member@trendprompts.com',
        },
        notes: {
          item: itemTitle,
          type: checkoutType,
          tier_or_pack: isCreditPack ? selectedCreditPackId : selectedPlanId,
        },
        themeColor: '#E60023',
        onSuccess: (data) => {
          setIsProcessing(false);

          if (isCreditPack && selectedPack) {
            addToolCredits(selectedPack.credits);
            showToast(`Added ${selectedPack.credits} Credits to your balance! 🎉`);
            setPaymentResult({
              success: true,
              orderId: data.order_id,
              paymentId: data.payment_id,
              creditsAdded: selectedPack.credits,
              message: `Successfully added ${selectedPack.credits} Credits to your account.`,
            });
          } else {
            setIsProUser(true);
            upgradePlan(selectedPlanId);
            showToast('Payment verified! Welcome to Pro Membership 🎉');
            setPaymentResult({
              success: true,
              orderId: data.order_id,
              paymentId: data.payment_id,
              message: `Successfully upgraded to ${(selectedPlanId || 'pro').toUpperCase()} plan.`,
            });
          }

          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.55 },
              colors: ['#E60023', '#FFD700', '#00C853', '#7C4DFF'],
            });
          } catch {}
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
    maximumFractionDigits: 0,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => !isProcessing && setIsProCheckoutModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto"
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
                Quick Razorpay Checkout
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

        {/* Tab Toggle */}
        <div className="flex p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setCheckoutType('credits')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all ${
              checkoutType === 'credits'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Credits Packs</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckoutType('subscription')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all ${
              checkoutType === 'subscription'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-purple-500" />
            <span>Monthly Plans</span>
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
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Selection Grid */}
            {checkoutType === 'credits' ? (
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Select Credits Top-Up Pack:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CREDIT_PACK_OPTIONS.map((pack) => {
                    const isSelected = selectedCreditPackId === pack.id;
                    return (
                      <div
                        key={pack.id}
                        onClick={() => setSelectedCreditPackId(pack.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative ${
                          isSelected
                            ? 'border-[#E60023] bg-red-50/40 dark:bg-red-950/20 shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        {pack.badge && (
                          <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[9px] font-black uppercase">
                            {pack.badge}
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            {pack.icon}
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {pack.rateText}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                            {pack.name}
                          </h4>
                          <span className="text-base font-black text-neutral-900 dark:text-white block">
                            {pack.displayPrice}
                          </span>
                        </div>

                        <ul className="space-y-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          {pack.features.map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Select Monthly Plan:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative ${
                          isSelected
                            ? 'border-[#E60023] bg-red-50/40 dark:bg-red-950/20 shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        {plan.badge && (
                          <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[9px] font-black uppercase">
                            {plan.badge}
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            {plan.icon}
                          </div>
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                            {plan.name}
                          </h4>
                          <span className="text-base font-black text-neutral-900 dark:text-white block">
                            {plan.displayPrice}
                            <span className="text-[10px] font-normal text-neutral-400"> /mo</span>
                          </span>
                        </div>

                        <ul className="space-y-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          {plan.features.map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* How credits work quick note */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px]">
                  <strong>1 Credit</strong> = Unlock Premium Prompt • <strong>3 Credits</strong> = Image to Prompt
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
