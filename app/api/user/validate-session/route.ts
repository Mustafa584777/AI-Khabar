import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';
import { PLAN_CONFIGS, getPlanFeaturesForCycle } from '@/lib/plans';
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

    // Check if activeSub has expired but holds a queuedPlan
    if (activeSub && activeSub.planExpiresAt && new Date(activeSub.planExpiresAt).getTime() <= Date.now()) {
      if (activeSub.queuedPlan) {
        const qp = activeSub.queuedPlan;
        const qpCfg = PLAN_CONFIGS[qp.planTier as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.pro;
        activeSub = {
          ...activeSub,
          planTier: qp.planTier,
          status: 'active',
          isProUser: true,
          planStartedAt: qp.scheduledStartAt || new Date().toISOString(),
          planExpiresAt: qp.scheduledExpiresAt,
          credits: qp.credits || qpCfg.credits,
          promptRequests: qp.promptRequests || qpCfg.promptRequests,
          aiSearchQuota: qp.aiSearchQuota || qpCfg.aiSearchQuota,
          queuedPlan: null,
        };
        void ServerStorage.saveUserSubscription(activeSub);
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

    // If an active subscription exists, enforce the active paid plan without restoring consumed credits
    if (hasActiveSub) {
      const subTier: PlanTier = activeSub.planTier as PlanTier;
      const subCfg = PLAN_CONFIGS[subTier] || PLAN_CONFIGS.pro;

      let subCredits: number;
      if (rowData?.toolCredits !== undefined && rowData?.toolCredits !== null) {
        subCredits = Number(rowData.toolCredits);
      } else if (activeSub.credits !== undefined && activeSub.credits !== null) {
        subCredits = Number(activeSub.credits);
      } else {
        subCredits = subCfg.credits;
      }

      let subRequests: number;
      if (rowData?.promptRequestsRemaining !== undefined && rowData?.promptRequestsRemaining !== null) {
        subRequests = Number(rowData.promptRequestsRemaining);
      } else if (activeSub.promptRequests !== undefined && activeSub.promptRequests !== null) {
        subRequests = Number(activeSub.promptRequests);
      } else {
        subRequests = subCfg.promptRequests;
      }

      let subSearches: number;
      if (subCfg.unlimitedSearches) {
        subSearches = 999999;
      } else if (rowData?.aiSearchRemaining !== undefined && rowData?.aiSearchRemaining !== null) {
        subSearches = Number(rowData.aiSearchRemaining);
      } else {
        subSearches = subCfg.aiSearchQuota;
      }

      rowData = {
        ...(rowData || {}),
        email: cleanEmail || rowData?.email,
        userId: userId || rowData?.userId,
        planTier: subTier,
        isProUser: true,
        toolCredits: subCredits,
        promptRequestsRemaining: subRequests,
        aiSearchRemaining: subSearches,
        planStartedAt: activeSub.planStartedAt || rowData?.planStartedAt,
        planExpiresAt: activeSub.planExpiresAt || rowData?.planExpiresAt,
        queuedPlan: activeSub.queuedPlan || rowData?.queuedPlan || null,
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

    // Authoritative check if plan has expired (never expire if user has active subscription)
    if (tier !== 'free' && cloned.planExpiresAt && !hasActiveSub) {
      const exp = new Date(cloned.planExpiresAt).getTime();
      if (!isNaN(exp) && exp < Date.now()) {
        if (cloned.queuedPlan) {
          const qp = cloned.queuedPlan;
          const qpCfg = getPlanFeaturesForCycle(qp.planTier as PlanTier, qp.billingCycle || 'monthly');
          tier = qp.planTier;
          cloned.isProUser = true;
          cloned.planTier = qp.planTier;
          cloned.toolCredits = (Number(cloned.toolCredits) || 0) + (qp.credits || qpCfg.credits);
          cloned.promptRequestsRemaining = qp.promptRequests || qpCfg.promptRequests;
          cloned.aiSearchRemaining = qpCfg.unlimitedSearches ? 999999 : (qp.aiSearchQuota || qpCfg.aiSearchQuota);
          cloned.savesLimit = qpCfg.savesLimit;
          cloned.planStartedAt = qp.scheduledStartAt || new Date().toISOString();
          cloned.planExpiresAt = qp.scheduledExpiresAt;
          cloned.queuedPlan = null;
        } else {
          tier = 'free';
          cloned.isProUser = false;
          cloned.planTier = 'free';
          cloned.promptRequestsRemaining = 0;
          cloned.aiSearchRemaining = 5;
          cloned.savesLimit = 10;
        }
      }
    }

    const isYearly = Boolean(
      cloned.billingCycle === 'yearly' ||
      (cloned.planExpiresAt && cloned.planStartedAt && (new Date(cloned.planExpiresAt).getTime() - new Date(cloned.planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
    );
    const planCfg = getPlanFeaturesForCycle(tier as PlanTier, isYearly ? 'yearly' : 'monthly');

    // Strictly preserve consumed balances! Do NOT reset with Math.max
    let currentCredits = cloned.toolCredits !== undefined && cloned.toolCredits !== null
      ? Number(cloned.toolCredits)
      : planCfg.credits;

    let currentRequests = cloned.promptRequestsRemaining !== undefined && cloned.promptRequestsRemaining !== null
      ? Number(cloned.promptRequestsRemaining)
      : (tier !== 'free' ? planCfg.promptRequests : 0);

    let currentAiSearchRemaining = planCfg.unlimitedSearches
      ? 999999
      : (cloned.aiSearchRemaining !== undefined && cloned.aiSearchRemaining !== null
          ? Number(cloned.aiSearchRemaining)
          : planCfg.aiSearchQuota);

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
