import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';

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

    // Fetch authoritative user record from Supabase
    let rowData: any = null;
    if (emailKey) {
      const { data: row } = await client
        .from('settings')
        .select('data')
        .eq('id', emailKey)
        .single();
      if (row?.data) rowData = row.data;
    }
    if (!rowData && userKey) {
      const { data: row } = await client
        .from('settings')
        .select('data')
        .eq('id', userKey)
        .single();
      if (row?.data) rowData = row.data;
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

    // Daily credits refresh check
    const todayStr = new Date().toISOString().split('T')[0];
    let currentCredits = Number(cloned.toolCredits ?? 2);
    if (!cloned.isProUser && tier === 'free') {
      if (cloned.lastDailyCreditDate !== todayStr) {
        currentCredits = Math.max(currentCredits, 2);
        cloned.lastDailyCreditDate = todayStr;
        cloned.toolCredits = currentCredits;
        // Save back refreshed daily credits
        if (emailKey) {
          await client.from('settings').upsert({ id: emailKey, data: cloned });
        }
        if (userKey) {
          await client.from('settings').upsert({ id: userKey, data: cloned });
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
        lastDailyCreditDate: cloned.lastDailyCreditDate,
        promptRequestsRemaining: cloned.promptRequestsRemaining ?? 0,
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
