import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      payment_id,
      signature,
    } = body;

    const orderId = razorpay_order_id || order_id;
    const paymentId = razorpay_payment_id || payment_id;
    const receivedSignature = razorpay_signature || signature;

    // Validate presence of required fields
    if (!orderId || !paymentId || !receivedSignature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required payment verification fields (order_id, payment_id, signature)',
        },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Razorpay secret key not configured on server',
        },
        { status: 500 }
      );
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isMatch =
      expectedSignature.length === receivedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(receivedSignature, 'utf-8')
      );

    if (!isMatch) {
      console.warn(`Payment signature mismatch for order: ${orderId}, payment: ${paymentId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed: signature mismatch',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      order_id: orderId,
      payment_id: paymentId,
      verified_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Unexpected error in verify-payment:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error while verifying payment',
      },
      { status: 500 }
    );
  }
}
