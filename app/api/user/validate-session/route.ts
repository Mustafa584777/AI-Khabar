import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';
import { PLAN_CONFIGS, computePlanExpiry } from '@/lib/plans';
import { PlanTier } from '@/types/prompt';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

function cleanEmailString(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function getEmailKey(email: string): string {
  const clean = cleanEmailString(email).replace(/[^a-z0-9_]/g, '_');
  return `user_sync_email_${clean}`;
}

function getUserKey(userId: string): string {
  return `user_sync_${userId.trim()}`;
}

export async function POST(req: NextRequest) {
  // Rate limiting protection (120 session validation req/min per IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('sync', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);
    const { userId, email } = body;

    const cleanEmail = cleanEmailString(email);
    const emailKey = cleanEmail ? getEmailKey(cleanEmail) : '';
    const userKey = userId ? getUserKey(userId) : '';

    if (!emailKey && !userKey) {
      return NextResponse.json(
        { success: false, error: 'User Email or User ID is required for session validation' },
        { status: 400 }
      );
    }

    const client = supabaseAdmin || supabase;

    // Fetch authoritative user record checking ServerStorage, active subscription, and Supabase
    let rowData: any = null;

    // 1. Check ServerStorage profile & active subscription
    let activeSub: any = null;
    if (cleanEmail) {
      try {
        activeSub = await ServerStorage.getUserSubscription(cleanEmail);
      } catch (e) {
        console.warn('ServerStorage subscription check notice:', e);
      }

      // Also check directly in Supabase if not found in ServerStorage
      if (!activeSub) {
        try {
          const cleanKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');
          const subId = `sub_${cleanKey}`;
          const { data: subRow } = await client.from('settings').select('data').eq('id', subId).maybeSingle();
          if (subRow?.data) {
            activeSub = subRow.data;
          }
        } catch {}
      }
    }

    const hasActiveSub = Boolean(
      activeSub &&
      activeSub.status === 'active' &&
      (!activeSub.planExpiresAt || new Date(activeSub.planExpiresAt).getTime() > Date.now())
    );

    try {
      if (cleanEmail || userId) {
        rowData = await ServerStorage.getUserProfile(cleanEmail, userId);
      }
    } catch (e) {
      console.warn('ServerStorage profile check notice:', e);
    }

    // 2. Check Supabase by emailKey or userKey if not already found
    if (!rowData) {
      if (emailKey) {
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', emailKey)
          .maybeSingle();
        if (row?.data) rowData = row.data;
      }
      if (!rowData && userKey) {
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', userKey)
          .maybeSingle();
        if (row?.data) rowData = row.data;
      }
      if (!rowData && cleanEmail) {
        const { data: rows } = await client
          .from('settings')
          .select('id, data')
          .filter('data->>email', 'eq', cleanEmail);
        if (Array.isArray(rows) && rows.length > 0) {
          const userRows = rows.filter((r) => r?.data && r.id?.startsWith('user_sync_'));
          if (userRows.length > 0) {
            rowData = userRows[0].data;
          }
        }
      }
    }

    // If an active subscription exists, unconditionally enforce the active paid plan
    if (hasActiveSub) {
      const subTier: PlanTier = activeSub.planTier as PlanTier;
      const subCfg = PLAN_CONFIGS[subTier] || PLAN_CONFIGS.pro;

      // Strictly preserve consumed credits and requests! Only fall back if never initialized
      const resolvedCredits = rowData?.toolCredits !== undefined && rowData?.toolCredits !== null
        ? Number(rowData.toolCredits)
        : (activeSub.credits || subCfg.credits);
      const resolvedRequests = rowData?.promptRequestsRemaining !== undefined && rowData?.promptRequestsRemaining !== null
        ? Number(rowData.promptRequestsRemaining)
        : (activeSub.promptRequests ?? subCfg.promptRequests);
      const resolvedAiSearches = subCfg.unlimitedSearches
        ? 999999
        : (rowData?.aiSearchRemaining !== undefined && rowData?.aiSearchRemaining !== null
            ? Math.min(Number(rowData.aiSearchRemaining), subCfg.aiSearchQuota)
            : (activeSub.aiSearchQuota ?? subCfg.aiSearchQuota));

      rowData = {
        ...(rowData || {}),
        email: cleanEmail || rowData?.email,
        userId: userId || rowData?.userId,
        planTier: subTier,
        isProUser: true,
        toolCredits: resolvedCredits,
        promptRequestsRemaining: resolvedRequests,
        aiSearchRemaining: resolvedAiSearches,
        planStartedAt: activeSub.planStartedAt || rowData?.planStartedAt,
        planExpiresAt: activeSub.planExpiresAt || rowData?.planExpiresAt,
        queuedPlan: rowData?.queuedPlan || activeSub.queuedPlan || null,
      };
    }

    if (!rowData) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'No remote session record found',
      });
    }

    const cloned = { ...rowData };
    let tier = cloned.planTier || (cloned.isProUser ? 'pro' : 'free');

    // Check if queuedPlan should be activated
    const queuedPlan = cloned.queuedPlan || activeSub?.queuedPlan || null;
    let currentCredits = cloned.toolCredits !== undefined && cloned.toolCredits !== null
      ? Number(cloned.toolCredits)
      : (tier !== 'free' ? (PLAN_CONFIGS[tier as PlanTier]?.credits || 0) : 5);
    let currentRequests = cloned.promptRequestsRemaining !== undefined && cloned.promptRequestsRemaining !== null
      ? Number(cloned.promptRequestsRemaining)
      : (tier !== 'free' ? (PLAN_CONFIGS[tier as PlanTier]?.promptRequests || 0) : 0);
    let currentAiSearchRemaining = PLAN_CONFIGS[tier as PlanTier]?.unlimitedSearches
      ? 999999
      : (cloned.aiSearchRemaining !== undefined && cloned.aiSearchRemaining !== null
          ? Math.min(Number(cloned.aiSearchRemaining), PLAN_CONFIGS[tier as PlanTier]?.aiSearchQuota || 5)
          : (PLAN_CONFIGS[tier as PlanTier]?.aiSearchQuota || 5));

    if (queuedPlan && cloned.planExpiresAt && new Date(cloned.planExpiresAt).getTime() <= Date.now()) {
      tier = queuedPlan.planTier;
      cloned.isProUser = true;
      cloned.planStartedAt = queuedPlan.planStartedAt || new Date().toISOString();
      cloned.planExpiresAt = queuedPlan.planExpiresAt || computePlanExpiry(cloned.planStartedAt, 30);
      currentCredits = queuedPlan.toolCredits;
      currentRequests = queuedPlan.promptRequestsRemaining;
      currentAiSearchRemaining = queuedPlan.aiSearchRemaining;
      cloned.queuedPlan = null;

      if (cleanEmail) {
        void ServerStorage.saveUserSubscription({
          email: cleanEmail,
          userId,
          planTier: queuedPlan.planTier,
          isProUser: true,
          status: 'active',
          planStartedAt: cloned.planStartedAt,
          planExpiresAt: cloned.planExpiresAt,
          credits: queuedPlan.credits,
          aiSearchQuota: queuedPlan.aiSearchRemaining,
          promptRequests: queuedPlan.promptRequestsRemaining,
          queuedPlan: null,
        });
        void ServerStorage.saveUserProfile(cleanEmail, userId, cloned);
      }
    } else {
      cloned.queuedPlan = queuedPlan;
      // Authoritative check if plan has expired (never expire if user has active subscription)
      if (tier !== 'free' && cloned.planExpiresAt && !hasActiveSub) {
        const exp = new Date(cloned.planExpiresAt).getTime();
        if (!isNaN(exp) && exp < Date.now()) {
          tier = 'free';
          cloned.isProUser = false;
          cloned.planTier = 'free';
        }
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      syncData: {
        userId: cloned.userId || userId,
        email: cloned.email || email,
        name: cloned.name,
        avatar: cloned.avatar,
        points: cloned.points ?? 10,
        bookmarkedIds: cloned.bookmarkedIds || [],
        likedIds: cloned.likedIds || [],
        aiHistory: cloned.aiHistory || [],
        tasteProfile: cloned.tasteProfile,
        planTier: tier,
        isProUser: tier !== 'free' || Boolean(cloned.isProUser),
        toolCredits: currentCredits,
        aiSearchRemaining: currentAiSearchRemaining,
        promptRequestsRemaining: currentRequests,
        unlockedPromptIds: cloned.unlockedPromptIds || [],
        planStartedAt: cloned.planStartedAt,
        planExpiresAt: cloned.planExpiresAt,
        queuedPlan: cloned.queuedPlan || null,
      },
    });
  } catch (err: any) {
    console.error('Session validation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Session validation failed' },
      { status: 500 }
    );
  }
}
