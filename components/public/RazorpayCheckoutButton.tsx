'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { startRazorpayCheckout } from '@/lib/razorpay';
import { useApp } from '@/context/AppContext';

export interface RazorpayCheckoutButtonProps {
  amount?: number; // in paise (e.g. 100 = ₹1.00, 19900 = ₹199.00)
  currency?: string;
  planName?: string;
  planTier?: 'starter' | 'pro' | 'vip';
  description?: string;
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'pill' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  notes?: Record<string, string>;
  onSuccess?: (data: any) => void;
  onFailure?: (error: any) => void;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount = 19900, // default ₹199
  currency = 'INR',
  planName = 'Pro Creator Pass',
  planTier = 'pro',
  description = 'Unlimited AI Studio Generations & VIP Prompts',
  buttonText,
  className = '',
  variant = 'primary',
  size = 'md',
  showIcon = true,
  notes,
  onSuccess,
  onFailure,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showToast, setIsProUser, upgradePlan, userAccount } = useApp();

  const handleCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      await startRazorpayCheckout({
        amount,
        currency,
        name: 'Trending Copy Paste Photo Prompts',
        description: `${planName} - ${description}`,
        receipt: `rcpt_${Date.now()}`,
        prefill: {
          name: userAccount?.name || userAccount?.username || 'Creative Member',
          email: userAccount?.email || 'member@trendprompts.com',
        },
        notes: {
          plan: planName,
          ...notes,
        },
        themeColor: '#E60023',
        onSuccess: (verifyData) => {
          setIsLoading(false);
          setIsSuccess(true);
          setIsProUser(true);
          upgradePlan(planTier);

          try {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#E60023', '#FFD700', '#00C853', '#2979FF'],
            });
          } catch {
            // ignore confetti fallback
          }

          showToast(`Payment Verified! Order ${verifyData.order_id.slice(-6)} successful 🎉`);
          if (onSuccess) {
            onSuccess(verifyData);
          }

          setTimeout(() => setIsSuccess(false), 5000);
        },
        onFailure: (err) => {
          setIsLoading(false);
          console.error('Razorpay payment failed:', err);
          showToast(`Payment Failed: ${err.message || 'Transaction could not be completed'}`);
          if (onFailure) {
            onFailure(err);
          }
        },
        onDismiss: () => {
          setIsLoading(false);
          showToast('Payment window closed');
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Unable to open checkout modal');
      if (onFailure) {
        onFailure(err);
      }
    }
  };

  const displayAmount = (amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white border border-neutral-200 dark:border-neutral-700';
      case 'outline':
        return 'bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 text-[#E60023] border-2 border-[#E60023]';
      case 'dark':
        return 'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-md';
      case 'pill':
        return 'bg-gradient-to-r from-[#E60023] to-[#ff3b56] hover:from-red-700 hover:to-red-600 text-white shadow-md shadow-red-500/25';
      case 'primary':
      default:
        return 'bg-[#E60023] hover:bg-[#ad081b] text-white shadow-md shadow-red-500/20';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs rounded-full gap-1.5';
      case 'lg':
        return 'px-6 py-3.5 text-sm sm:text-base font-black rounded-2xl gap-2.5';
      case 'md':
      default:
        return 'px-4 py-2.5 text-xs sm:text-sm font-bold rounded-full gap-2';
    }
  };

  const label = buttonText || `Pay with Razorpay ${displayAmount}`;

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={isLoading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      id={`razorpay-btn-${amount}`}
      title={`Checkout via Razorpay ${displayAmount}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" />
          <span>Payment Verified!</span>
        </>
      ) : (
        <>
          {showIcon && (variant === 'pill' ? <Sparkles className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />)}
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
