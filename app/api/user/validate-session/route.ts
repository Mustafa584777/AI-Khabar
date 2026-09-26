import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';
import { PLAN_CONFIGS } from '@/lib/plans';
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
    try {
      if (cleanEmail || userId) {
        rowData = await ServerStorage.getUserProfile(cleanEmail, userId);
      }
      if (cleanEmail) {
        const activeSub = await ServerStorage.getUserSubscription(cleanEmail);
        if (activeSub && activeSub.status === 'active') {
          rowData = {
            ...(rowData || {}),
            email: cleanEmail,
            planTier: activeSub.planTier,
            isProUser: true,
            toolCredits: Math.max(Number(rowData?.toolCredits || 0), activeSub.credits),
            aiSearchRemaining: Math.max(Number(rowData?.aiSearchRemaining || 0), activeSub.aiSearchQuota),
            promptRequestsRemaining: Math.max(Number(rowData?.promptRequestsRemaining || 0), activeSub.promptRequests),
            planStartedAt: activeSub.planStartedAt,
            planExpiresAt: activeSub.planExpiresAt,
          };
        }
      }
    } catch (e) {
      console.warn('ServerStorage session validation notice:', e);
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
          .select('data')
          .filter('data->>email', 'eq', cleanEmail);
        if (Array.isArray(rows) && rows.length > 0) {
          rowData = rows[0]?.data;
        }
      }
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

    // Authoritative check if plan has expired
    if (tier !== 'free' && cloned.planExpiresAt) {
      const exp = new Date(cloned.planExpiresAt).getTime();
      if (!isNaN(exp) && exp < Date.now()) {
        tier = 'free';
        cloned.isProUser = false;
        cloned.planTier = 'free';
      }
    }

    const planCfg = PLAN_CONFIGS[tier as PlanTier] || PLAN_CONFIGS.free;

    let currentCredits = Math.max(Number(cloned.toolCredits ?? planCfg.credits), planCfg.credits);
    let currentRequests = Math.max(Number(cloned.promptRequestsRemaining ?? planCfg.promptRequests), planCfg.promptRequests);
    let currentAiSearchRemaining = Math.max(Number(cloned.aiSearchRemaining ?? planCfg.aiSearchQuota), planCfg.aiSearchQuota);

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
