import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amount, currency = 'INR', receipt, notes } = body;

    // Validate amount (must be in paise, >= 100)
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 100) {
      return NextResponse.json(
        {
          error: 'Amount must be at least 100 paise (₹1.00)',
          min_amount: 100,
        },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials not configured on server' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receiptId = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(numericAmount),
        currency: String(currency || 'INR').toUpperCase(),
        receipt: receiptId,
        notes: notes || {},
      });

      return NextResponse.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
      });
    } catch (apiError: any) {
      console.error('Razorpay API error creating order:', apiError);

      // Handle auth failures (HTTP 401)
      if (
        apiError?.statusCode === 401 ||
        (apiError?.error?.code === 'BAD_REQUEST_ERROR' &&
          apiError?.error?.description?.toLowerCase().includes('auth'))
      ) {
        return NextResponse.json(
          { error: apiError?.error?.description || 'Razorpay authentication failed: check your API keys' },
          { status: 401 }
        );
      }

      const statusCode = apiError?.statusCode || 500;
      const errorMessage =
        apiError?.error?.description || apiError?.message || 'Failed to create order on Razorpay';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }
  } catch (err: any) {
    console.error('Unexpected server error in create-order:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while creating order' },
      { status: 500 }
    );
  }
}
