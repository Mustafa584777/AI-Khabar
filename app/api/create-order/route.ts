import { NextRequest, NextResponse } from 'next/server';

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

    const receiptId = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(numericAmount),
          currency: String(currency || 'INR').toUpperCase(),
          receipt: receiptId,
          notes: notes || {},
        }),
      });

      const order = await response.json();

      if (!response.ok) {
        console.error('Razorpay API error creating order:', order);
        const statusCode = response.status || 500;
        const errorMessage =
          order?.error?.description || order?.message || 'Failed to create order on Razorpay';
        return NextResponse.json({ error: errorMessage }, { status: statusCode });
      }

      return NextResponse.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
      });
    } catch (apiError: any) {
      console.error('Razorpay fetch error:', apiError);
      return NextResponse.json(
        { error: apiError?.message || 'Failed to connect to Razorpay payment gateway' },
        { status: 500 }
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

