import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ServerStorage } from '@/lib/server-storage';
import { PLAN_CONFIGS } from '@/lib/plans';
import { PlanTier } from '@/types/prompt';

export const dynamic = 'force-dynamic';

function cleanEmailString(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

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
      email,
      userId,
      planTier,
      checkoutType,
      creditsToAdd,
      planName,
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

    // Payment Signature Verified! Now atomically activate and persist subscription & credits
    const cleanEmail = cleanEmailString(email);
    let updatedSyncData: any = null;

    if (cleanEmail) {
      const now = new Date();
      const planStartedAt = now.toISOString();
      const planExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const isCreditPack = checkoutType === 'credits' || (creditsToAdd && Number(creditsToAdd) > 0);

      // Fetch existing profile
      const existingProfile = (await ServerStorage.getUserProfile(cleanEmail, userId)) || {};

      if (isCreditPack) {
        const addedCredits = Number(creditsToAdd) || 120;
        const currentCredits = Number(existingProfile.toolCredits || 5);
        const newCredits = currentCredits + addedCredits;

        updatedSyncData = {
          ...existingProfile,
          email: cleanEmail,
          userId: userId || existingProfile.userId,
          toolCredits: newCredits,
          lastPaymentId: paymentId,
          lastOrderId: orderId,
          updatedAt: new Date().toISOString(),
        };

        await ServerStorage.saveUserProfile(cleanEmail, userId, updatedSyncData);
      } else {
        // Membership Plan Subscription (starter, pro, vip, ultra)
        const validTiers: PlanTier[] = ['starter', 'pro', 'vip', 'ultra'];
        const resolvedTier: PlanTier = validTiers.includes(planTier as PlanTier)
          ? (planTier as PlanTier)
          : 'pro';
        const planCfg = PLAN_CONFIGS[resolvedTier] || PLAN_CONFIGS.pro;

        // 1. Save Permanent Subscription Record
        await ServerStorage.saveUserSubscription({
          email: cleanEmail,
          userId,
          planTier: resolvedTier,
          isProUser: true,
          status: 'active',
          planStartedAt,
          planExpiresAt,
          credits: planCfg.credits,
          aiSearchQuota: planCfg.aiSearchQuota,
          promptRequests: planCfg.promptRequests,
          orderId,
          paymentId,
        });

        // 2. Compute updated credits and quotas
        const currentCredits = Number(existingProfile.toolCredits || 0);
        const resolvedCredits = Math.max(currentCredits + planCfg.credits, planCfg.credits);
        const currentRequests = Number(existingProfile.promptRequestsRemaining || 0);
        const resolvedRequests = Math.max(currentRequests + planCfg.promptRequests, planCfg.promptRequests);
        const currentAiSearches = Number(existingProfile.aiSearchRemaining || 0);
        const resolvedAiSearches = planCfg.unlimitedSearches
          ? 999999
          : Math.max(currentAiSearches, planCfg.aiSearchQuota);

        const addedPoints = resolvedTier === 'starter' ? 10 : resolvedTier === 'pro' ? 20 : resolvedTier === 'vip' ? 50 : 100;
        const resolvedPoints = (existingProfile.points || 10) + addedPoints;

        updatedSyncData = {
          ...existingProfile,
          email: cleanEmail,
          userId: userId || existingProfile.userId,
          planTier: resolvedTier,
          isProUser: true,
          toolCredits: resolvedCredits,
          promptRequestsRemaining: resolvedRequests,
          aiSearchRemaining: resolvedAiSearches,
          points: resolvedPoints,
          planStartedAt,
          planExpiresAt,
          lastPaymentId: paymentId,
          lastOrderId: orderId,
          updatedAt: new Date().toISOString(),
        };

        // 3. Save Primary User Profile Record
        await ServerStorage.saveUserProfile(cleanEmail, userId, updatedSyncData);
      }

      // 4. Record order details for audit
      await ServerStorage.saveOrder({
        orderId,
        paymentId,
        email: cleanEmail,
        userId,
        planTier: isCreditPack ? 'credits' : (planTier || 'pro'),
        planName,
        checkoutType: isCreditPack ? 'credits' : 'subscription',
        creditsAdded: creditsToAdd || (updatedSyncData?.toolCredits ?? 0),
        verifiedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and plan activated successfully',
      order_id: orderId,
      payment_id: paymentId,
      verified_at: new Date().toISOString(),
      userSyncData: updatedSyncData,
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
