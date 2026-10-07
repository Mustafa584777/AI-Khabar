'use client';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayPaymentFailedResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

export interface CheckoutOptions {
  amount: number; // in paise (e.g. 100 = ₹1.00)
  currency?: string; // default: 'INR'
  name?: string;
  description?: string;
  image?: string;
  receipt?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess?: (verifyData: {
    success: boolean;
    order_id: string;
    payment_id: string;
    message: string;
  }) => void;
  onFailure?: (error: { message: string; details?: any }) => void;
  onDismiss?: () => void;
}

/**
 * Dynamically loads the Razorpay checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay checkout flow:
 * 1. Calls /api/create-order to create order on server
 * 2. Launches Razorpay modal with order_id
 * 3. On success, calls /api/verify-payment to verify signature
 */
export async function startRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  const {
    amount,
    currency = 'INR',
    name = 'Trending Copy Paste Photo Prompts',
    description = 'Pro Membership & Studio Access',
    image = '/logo.png',
    receipt,
    notes,
    prefill,
    themeColor = '#E60023',
    onSuccess,
    onFailure,
    onDismiss,
  } = options;

  try {
    // 1. Ensure Razorpay SDK script is ready
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      throw new Error('Razorpay SDK failed to load. Please check your network connection.');
    }

    // 2. Create Order on backend
    const orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes,
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.order_id) {
      throw new Error(orderData.error || 'Failed to initialize payment order');
    }

    const keyId =
      orderData.key_id ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      'rzp_live_TAsRhhdJwnXn7B';

    // 3. Configure Razorpay modal options
    const rzpOptions = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name,
      description,
      image,
      order_id: orderData.order_id,
      prefill: prefill || {
        name: 'Creative Member',
        email: 'member@example.com',
      },
      notes: notes || {
        service: 'AuraPrompt / Trending Prompts Pro',
      },
      theme: {
        color: themeColor,
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) {
            onDismiss();
          }
        },
      },
      handler: async function (response: RazorpayPaymentSuccessResponse) {
        try {
          // 4. Verify payment signature on backend
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.error || 'Payment verification failed on server');
          }

          if (onSuccess) {
            onSuccess(verifyData);
          }
        } catch (verifyErr: any) {
          if (onFailure) {
            onFailure({
              message: verifyErr.message || 'Signature verification failed',
              details: verifyErr,
            });
          }
        }
      },
    };

    const rzp = new window.Razorpay(rzpOptions);

    rzp.on('payment.failed', function (response: RazorpayPaymentFailedResponse) {
      if (onFailure) {
        onFailure({
          message: response?.error?.description || 'Payment transaction failed',
          details: response?.error,
        });
      }
    });

    rzp.open();
  } catch (err: any) {
    if (onFailure) {
      onFailure({ message: err.message || 'Payment initiation error', details: err });
    }
  }
}
