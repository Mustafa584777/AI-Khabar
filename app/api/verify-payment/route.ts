import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ServerStorage } from '@/lib/server-storage';
import { PLAN_CONFIGS, computePlanExpiry, formatPlanDateWithTime } from '@/lib/plans';
import { PlanTier, QueuedPlan } from '@/types/prompt';

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
      const isCreditPack = checkoutType === 'credits' || (creditsToAdd && Number(creditsToAdd) > 0);

      // Fetch existing profile & existing subscription
      const existingProfile = (await ServerStorage.getUserProfile(cleanEmail, userId)) || {};
      const existingSub = await ServerStorage.getUserSubscription(cleanEmail);

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

        await ServerStorage.saveOrder({
          orderId,
          paymentId,
          email: cleanEmail,
          userId,
          planTier: 'credits',
          planName: planName || `${addedCredits} Credits Pack`,
          checkoutType: 'credits',
          creditsAdded: addedCredits,
          verifiedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: `Payment verified! Added ${addedCredits} credits to your account.`,
          order_id: orderId,
          payment_id: paymentId,
          verified_at: new Date().toISOString(),
          userSyncData: updatedSyncData,
        });
      } else {
        // Membership Plan Subscription (starter, pro, vip, ultra)
        const validTiers: PlanTier[] = ['starter', 'pro', 'vip', 'ultra'];
        const resolvedTier: PlanTier = validTiers.includes(planTier as PlanTier)
          ? (planTier as PlanTier)
          : 'pro';
        const planCfg = PLAN_CONFIGS[resolvedTier] || PLAN_CONFIGS.pro;

        // Check if user ALREADY has an active, unexpired plan!
        const currentTier = existingProfile.planTier || (existingProfile.isProUser ? 'pro' : null) || existingSub?.planTier;
        const currentExpiresAt = existingProfile.planExpiresAt || existingSub?.planExpiresAt;
        const isCurrentActive = Boolean(
          currentTier &&
          currentTier !== 'free' &&
          currentExpiresAt &&
          new Date(currentExpiresAt).getTime() > Date.now()
        );

        if (isCurrentActive) {
          // USER ALREADY HAS AN ACTIVE PLAN:
          // Do NOT merge credits or features into existing plan!
          // New plan starts right after existing plan ends at 11:59 PM.
          const queuedStartedAt = currentExpiresAt!;
          const queuedExpiresAt = computePlanExpiry(queuedStartedAt, 30);

          const queuedPlan: QueuedPlan = {
            id: `queued_${Date.now()}`,
            orderId,
            paymentId,
            planTier: resolvedTier,
            planName: planCfg.name,
            credits: planCfg.credits,
            toolCredits: planCfg.credits,
            promptRequestsRemaining: planCfg.promptRequests,
            aiSearchRemaining: planCfg.unlimitedSearches ? 999999 : planCfg.aiSearchQuota,
            planStartedAt: queuedStartedAt,
            planExpiresAt: queuedExpiresAt,
            purchasedAt: new Date().toISOString(),
            status: 'queued',
          };

          // Save queued plan in subscription
          if (existingSub) {
            await ServerStorage.saveUserSubscription({
              ...existingSub,
              email: cleanEmail,
              userId: userId || existingSub.userId,
              queuedPlan,
            });
          }

          // Existing plan remains active with its current credits and features!
          const addedPoints = resolvedTier === 'starter' ? 10 : resolvedTier === 'pro' ? 20 : resolvedTier === 'vip' ? 50 : 100;
          const resolvedPoints = (existingProfile.points || 10) + addedPoints;

          updatedSyncData = {
            ...existingProfile,
            email: cleanEmail,
            userId: userId || existingProfile.userId,
            queuedPlan,
            points: resolvedPoints,
            lastPaymentId: paymentId,
            lastOrderId: orderId,
            updatedAt: new Date().toISOString(),
          };

          await ServerStorage.saveUserProfile(cleanEmail, userId, updatedSyncData);

          await ServerStorage.saveOrder({
            orderId,
            paymentId,
            email: cleanEmail,
            userId,
            planTier: resolvedTier,
            planName: planCfg.name,
            checkoutType: 'subscription_queued',
            creditsAdded: planCfg.credits,
            verifiedAt: new Date().toISOString(),
          });

          return NextResponse.json({
            success: true,
            isQueued: true,
            message: `Your ${planCfg.name} Plan is queued and will automatically start on ${formatPlanDateWithTime(queuedStartedAt)} after your current plan expires!`,
            order_id: orderId,
            payment_id: paymentId,
            verified_at: new Date().toISOString(),
            userSyncData: updatedSyncData,
          });
        }

        // NO ACTIVE PLAN (Brand new or previously expired):
        // Activate immediately!
        const now = new Date();
        const planStartedAt = now.toISOString();
        const planExpiresAt = computePlanExpiry(now, 30); // Anchored to 11:59:59 PM IST!

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
          aiSearchQuota: planCfg.unlimitedSearches ? 999999 : planCfg.aiSearchQuota,
          promptRequests: planCfg.promptRequests,
          orderId,
          paymentId,
          queuedPlan: null,
        });

        // 2. Compute updated credits and quotas for newly activated plan
        const currentCredits = Number(existingProfile.toolCredits || 0);
        const resolvedCredits = Math.max(currentCredits, planCfg.credits);
        const resolvedRequests = Math.max(Number(existingProfile.promptRequestsRemaining || 0), planCfg.promptRequests);
        const resolvedAiSearches = planCfg.unlimitedSearches
          ? 999999
          : Math.max(Number(existingProfile.aiSearchRemaining || 0), planCfg.aiSearchQuota);

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
          queuedPlan: null,
          lastPaymentId: paymentId,
          lastOrderId: orderId,
          updatedAt: new Date().toISOString(),
        };

        // 3. Save Primary User Profile Record
        await ServerStorage.saveUserProfile(cleanEmail, userId, updatedSyncData);

        // 4. Record order details for audit
        await ServerStorage.saveOrder({
          orderId,
          paymentId,
          email: cleanEmail,
          userId,
          planTier,
          planName: planCfg.name,
          checkoutType: 'subscription',
          creditsAdded: planCfg.credits,
          verifiedAt: new Date().toISOString(),
        });
      }
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
