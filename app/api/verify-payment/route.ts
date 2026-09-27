import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ServerStorage } from '@/lib/server-storage';
import { PLAN_CONFIGS, calculatePlanDates, calculateQueuedPlanDates, formatExpiryDateWithHour } from '@/lib/plans';
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

    // Payment Signature Verified! Now atomically activate or queue subscription & credits
    const cleanEmail = cleanEmailString(email);
    let updatedSyncData: any = null;

    if (cleanEmail) {
      const isCreditPack = checkoutType === 'credits' || (creditsToAdd && Number(creditsToAdd) > 0);

      // Fetch existing profile and subscription
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

        // Record order details for audit
        await ServerStorage.saveOrder({
          orderId,
          paymentId,
          email: cleanEmail,
          userId,
          planTier: 'credits',
          planName: planName || 'Credits Pack',
          checkoutType: 'credits',
          creditsAdded: addedCredits,
          verifiedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          isQueued: false,
          message: `${addedCredits} credits successfully added to your account!`,
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

        // Check if user currently has an active, unexpired paid plan
        const currentTier = (existingSub?.planTier || existingProfile.planTier) as PlanTier;
        const currentExpiresAt = existingSub?.planExpiresAt || existingProfile.planExpiresAt;
        const isCurrentPaid = ['starter', 'pro', 'vip', 'ultra'].includes(currentTier);
        const isCurrentActive = Boolean(
          isCurrentPaid &&
          currentExpiresAt &&
          new Date(currentExpiresAt).getTime() > Date.now()
        );

        if (isCurrentActive) {
          // USER ALREADY HAS AN ACTIVE PAID PLAN!
          // STRICT RULE: DO NOT MERGE OR OVERWRITE ACTIVE PLAN CREDITS OR FEATURES!
          // The new plan is queued to start immediately after the active plan expires at 11:59 PM.
          const queueBase = existingSub?.queuedPlan?.scheduledExpiresAt || existingProfile.queuedPlan?.scheduledExpiresAt || currentExpiresAt;
          const { scheduledStartAt, scheduledExpiresAt } = calculateQueuedPlanDates(queueBase, 30);

          const queuedPlan: QueuedPlan = {
            planTier: resolvedTier,
            planName: planCfg.name,
            credits: planCfg.credits,
            promptRequests: planCfg.promptRequests,
            aiSearchQuota: planCfg.aiSearchQuota,
            unlimitedSearches: planCfg.unlimitedSearches,
            unlimitedSaves: planCfg.unlimitedSaves,
            scheduledStartAt,
            scheduledExpiresAt,
            orderId,
            paymentId,
            purchasedAt: new Date().toISOString(),
            durationDays: 30,
          };

          // Save permanent subscription with queuedPlan without touching active plan
          await ServerStorage.saveUserSubscription({
            ...(existingSub || {}),
            email: cleanEmail,
            userId: userId || existingSub?.userId,
            queuedPlan,
          });

          // Update user profile with queuedPlan
          updatedSyncData = {
            ...existingProfile,
            email: cleanEmail,
            userId: userId || existingProfile.userId,
            queuedPlan,
            lastPaymentId: paymentId,
            lastOrderId: orderId,
            updatedAt: new Date().toISOString(),
          };

          await ServerStorage.saveUserProfile(cleanEmail, userId, updatedSyncData);

          // Save order
          await ServerStorage.saveOrder({
            orderId,
            paymentId,
            email: cleanEmail,
            userId,
            planTier: resolvedTier,
            planName: planCfg.name,
            checkoutType: 'subscription_queued',
            creditsAdded: planCfg.credits,
            scheduledStartAt,
            scheduledExpiresAt,
            verifiedAt: new Date().toISOString(),
          });

          return NextResponse.json({
            success: true,
            isQueued: true,
            queuedPlan,
            message: `Your current ${currentTier.toUpperCase()} plan is active until ${formatExpiryDateWithHour(currentExpiresAt)}. Your new ${planCfg.name} plan is queued and will start automatically after that date at 11:59 PM.`,
            order_id: orderId,
            payment_id: paymentId,
            verified_at: new Date().toISOString(),
            userSyncData: updatedSyncData,
          });
        }

        // USER IS FREE OR HAS AN EXPIRED PLAN -> ACTIVATE IMMEDIATELY!
        const { planStartedAt, planExpiresAt } = calculatePlanDates(new Date(), 30);

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
          queuedPlan: null,
        });

        // 2. Set plan credits and features on fresh activation
        const resolvedCredits = planCfg.credits;
        const resolvedRequests = planCfg.promptRequests;
        const resolvedAiSearches = planCfg.unlimitedSearches
          ? 999999
          : planCfg.aiSearchQuota;

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
          planTier: resolvedTier,
          planName,
          checkoutType: 'subscription',
          creditsAdded: planCfg.credits,
          verifiedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          isQueued: false,
          message: `Payment verified and ${planCfg.name} plan activated successfully! Valid until ${formatExpiryDateWithHour(planExpiresAt)}.`,
          order_id: orderId,
          payment_id: paymentId,
          verified_at: new Date().toISOString(),
          userSyncData: updatedSyncData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
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

