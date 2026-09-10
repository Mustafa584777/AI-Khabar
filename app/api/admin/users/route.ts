import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { RegisteredUserRecord, PlanTier } from '@/types/prompt';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';

export const dynamic = 'force-dynamic';

function getCleanEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

function getSyncKey(userId?: string, email?: string): string {
  if (userId) return `user_sync_${userId}`;
  if (email) {
    const clean = email.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `user_sync_email_${clean}`;
  }
  return '';
}

export async function GET(req: NextRequest) {
  // Security: Rate limiting protection (35 req/min)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('admin', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const client = supabaseAdmin || supabase;
    const usersMap = new Map<string, RegisteredUserRecord>();

    // 1. Fetch from Supabase settings table (user_sync_* rows)
    try {
      const { data: syncRows, error: syncError } = await client
        .from('settings')
        .select('*')
        .like('id', 'user_sync_%');

      if (!syncError && Array.isArray(syncRows)) {
        for (const row of syncRows) {
          const syncData = row.data || {};
          const email = getCleanEmail(syncData.email);
          const userId = syncData.userId || row.id.replace(/^user_sync_email_/, '').replace(/^user_sync_/, '');
          const key = email || userId;

          if (!key) continue;

          const planTier: PlanTier = syncData.planTier || (syncData.isProUser ? 'pro' : 'free');
          const isProUser = planTier !== 'free' || Boolean(syncData.isProUser);
          const toolCredits = typeof syncData.toolCredits === 'number' ? syncData.toolCredits : 2;
          const points = typeof syncData.points === 'number' ? syncData.points : 10;
          const unlockedPromptIds = Array.isArray(syncData.unlockedPromptIds) ? syncData.unlockedPromptIds : [];
          const bookmarks = Array.isArray(syncData.bookmarkedIds) ? syncData.bookmarkedIds : [];
          const likes = Array.isArray(syncData.likedIds) ? syncData.likedIds : [];
          const aiHistory = Array.isArray(syncData.aiHistory) ? syncData.aiHistory : [];

          const existing = usersMap.get(key);
          if (!existing) {
            usersMap.set(key, {
              id: userId,
              email: email || `${userId}@user.local`,
              name: syncData.name || (email ? email.split('@')[0] : 'Creator'),
              username: syncData.username || (email ? `@${email.split('@')[0]}` : '@creator'),
              avatar: syncData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
              planTier,
              isProUser,
              toolCredits,
              points,
              unlockedPromptIds,
              promptRequestsRemaining: syncData.promptRequestsRemaining || 0,
              aiHistoryCount: aiHistory.length,
              bookmarksCount: bookmarks.length,
              likesCount: likes.length,
              joinedDate: syncData.joinedDate || (syncData.updatedAt ? new Date(syncData.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'),
              lastSyncedAt: syncData.updatedAt || new Date().toISOString(),
              source: 'supabase_sync',
              rawSyncData: syncData,
            });
          } else {
            // Merge with highest priority
            const updatedUnlocks = Array.from(new Set([...existing.unlockedPromptIds, ...unlockedPromptIds]));
            existing.unlockedPromptIds = updatedUnlocks;
            if (toolCredits > existing.toolCredits) existing.toolCredits = toolCredits;
            if (points > existing.points) existing.points = points;
            if (planTier !== 'free' && existing.planTier === 'free') {
              existing.planTier = planTier;
              existing.isProUser = true;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Sync table fetch error:', err);
    }

    // 2. Fetch from Supabase Auth Admin Users (if service role key is active)
    if (supabaseAdmin) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authError && authData?.users) {
          for (const u of authData.users) {
            const email = getCleanEmail(u.email);
            const key = email || u.id;
            const meta = u.user_metadata || {};
            const createdDate = u.created_at
              ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recently';

            const existing = usersMap.get(key);
            if (existing) {
              existing.source = 'supabase_auth';
              if (u.id) existing.id = u.id;
              if (createdDate && (!existing.joinedDate || existing.joinedDate === 'Recently')) {
                existing.joinedDate = createdDate;
              }
            } else {
              const emailPrefix = email ? email.split('@')[0] : 'Creator';
              usersMap.set(key, {
                id: u.id,
                email: email || `${u.id}@user.local`,
                name: meta.full_name || meta.name || emailPrefix,
                username: meta.user_name ? `@${meta.user_name}` : `@${emailPrefix}`,
                avatar: meta.avatar_url || meta.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
                planTier: 'free',
                isProUser: false,
                toolCredits: 2,
                points: 10,
                unlockedPromptIds: [],
                promptRequestsRemaining: 0,
                aiHistoryCount: 0,
                bookmarksCount: 0,
                likesCount: 0,
                joinedDate: createdDate,
                lastSyncedAt: u.updated_at || u.created_at || new Date().toISOString(),
                source: 'supabase_auth',
              });
            }
          }
        }
      } catch (authErr) {
        console.warn('Auth admin listUsers error:', authErr);
      }
    }

    const users = Array.from(usersMap.values());

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      fetchedAt: new Date().toISOString(),
      users,
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch users from database' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Security: Rate limiting protection (35 req/min)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('admin', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);
    const { action, users, mode = 'merge' } = body;
    const client = supabaseAdmin || supabase;

    // 1. RESTORE ALL USERS FROM BACKUP
    if (action === 'restore_users') {
      if (!Array.isArray(users) || users.length === 0) {
        return NextResponse.json({ success: false, error: 'No user records provided for restoration' }, { status: 400 });
      }

      let restoredCount = 0;
      const errors: string[] = [];

      for (const item of users) {
        try {
          const userId = item.id || `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const email = getCleanEmail(item.email);
          const key = getSyncKey(userId, email);

          if (!key) continue;

          // Fetch existing to merge safely if mode === 'merge'
          let existingData: any = {};
          if (mode === 'merge') {
            const { data: row } = await client.from('settings').select('data').eq('id', key).single();
            if (row?.data) existingData = row.data;
          }

          const resolvedTier = item.planTier || existingData.planTier || 'free';
          const resolvedCredits = typeof item.toolCredits === 'number'
            ? Math.max(item.toolCredits, existingData.toolCredits || 0)
            : (existingData.toolCredits || 2);
          const resolvedPoints = typeof item.points === 'number'
            ? Math.max(item.points, existingData.points || 0)
            : (existingData.points || 10);
          const resolvedUnlocks = Array.from(
            new Set([...(existingData.unlockedPromptIds || []), ...(item.unlockedPromptIds || [])])
          );

          const payload = {
            ...existingData,
            ...(item.rawSyncData || {}),
            userId,
            email,
            name: item.name || existingData.name || (email ? email.split('@')[0] : 'Creator'),
            username: item.username || existingData.username || (email ? `@${email.split('@')[0]}` : '@creator'),
            avatar: item.avatar || existingData.avatar,
            planTier: resolvedTier,
            isProUser: resolvedTier !== 'free' || Boolean(item.isProUser || existingData.isProUser),
            toolCredits: resolvedCredits,
            points: resolvedPoints,
            unlockedPromptIds: resolvedUnlocks,
            promptRequestsRemaining: item.promptRequestsRemaining ?? existingData.promptRequestsRemaining ?? 0,
            joinedDate: item.joinedDate || existingData.joinedDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            restoredAt: new Date().toISOString(),
          };

          const { error: upsertErr } = await client.from('settings').upsert({
            id: key,
            data: payload,
          });

          if (!upsertErr) {
            restoredCount++;
            // Also upsert by email key if different
            if (email) {
              const emailKey = getSyncKey(undefined, email);
              if (emailKey !== key) {
                await client.from('settings').upsert({ id: emailKey, data: payload });
              }
            }
          } else {
            errors.push(`User ${email || userId}: ${upsertErr.message}`);
          }
        } catch (e: any) {
          errors.push(e?.message || 'Item error');
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully restored ${restoredCount} user accounts into Supabase database.`,
        restoredCount,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      });
    }

    // 2. UPDATE USER PLAN / CREDITS DIRECTLY
    if (action === 'update_user') {
      const { userId, email, planTier, toolCredits, points } = body;
      const key = getSyncKey(userId, email);
      if (!key) {
        return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
      }

      const { data: existingRow } = await client.from('settings').select('data').eq('id', key).single();
      const existing = existingRow?.data || {};

      const updatedPayload = {
        ...existing,
        userId: userId || existing.userId,
        email: email || existing.email,
        planTier: planTier || existing.planTier || 'free',
        isProUser: planTier ? planTier !== 'free' : existing.isProUser,
        toolCredits: typeof toolCredits === 'number' ? toolCredits : (existing.toolCredits ?? 2),
        points: typeof points === 'number' ? points : (existing.points ?? 10),
        updatedAt: new Date().toISOString(),
      };

      await client.from('settings').upsert({ id: key, data: updatedPayload });

      if (email) {
        const emailKey = getSyncKey(undefined, email);
        if (emailKey !== key) {
          await client.from('settings').upsert({ id: emailKey, data: updatedPayload });
        }
      }

      return NextResponse.json({ success: true, message: 'User updated successfully', updated: updatedPayload });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error processing users request' },
      { status: 500 }
    );
  }
}
