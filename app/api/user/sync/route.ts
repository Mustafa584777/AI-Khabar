import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';

export const dynamic = 'force-dynamic';

function getSyncKey(userId?: string, email?: string): string {
  if (userId) return `user_sync_${userId}`;
  if (email) {
    const clean = email.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `user_sync_email_${clean}`;
  }
  return '';
}

export async function POST(req: NextRequest) {
  // Security: Rate limiting protection (90 sync req/min per IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('sync', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);
    const { action, userId, email, data } = body;

    const key = getSyncKey(userId, email);
    if (!key) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    // 1. PULL: Retrieve synced data for user
    if (action === 'pull' || !action) {
      const { data: row, error } = await client
        .from('settings')
        .select('*')
        .eq('id', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Fallback: If searched by userId, also check email key
        if (email) {
          const emailKey = getSyncKey(undefined, email);
          const { data: emailRow } = await client
            .from('settings')
            .select('*')
            .eq('id', emailKey)
            .single();

          if (emailRow?.data) {
            return NextResponse.json({ success: true, syncData: emailRow.data });
          }
        }
        return NextResponse.json({ success: true, syncData: null });
      }

      const rawSync = row?.data || null;
      if (rawSync) {
        const syncData = { ...rawSync };
        const credits = Number(syncData.toolCredits || 0);
        if (credits > 2 || syncData.isProUser || (syncData.planTier && syncData.planTier !== 'free')) {
          syncData.isProUser = true;
          if (!syncData.planTier || syncData.planTier === 'free') {
            syncData.planTier = credits >= 499 ? 'vip' : (credits >= 250 ? 'pro' : 'starter');
          }
        }
        return NextResponse.json({
          success: true,
          syncData,
        });
      }

      return NextResponse.json({
        success: true,
        syncData: null,
      });
    }

    // 2. PUSH: Save / update synced data for user
    if (action === 'push') {
      if (!data || typeof data !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid data payload' }, { status: 400 });
      }

      // Fetch existing to merge
      const { data: existingRow } = await client
        .from('settings')
        .select('*')
        .eq('id', key)
        .single();

      const existingData = existingRow?.data || {};

      // Merge arrays uniquely
      const mergedBookmarks = Array.from(
        new Set([...(existingData.bookmarkedIds || []), ...(data.bookmarkedIds || [])])
      );
      const mergedLikes = Array.from(
        new Set([...(existingData.likedIds || []), ...(data.likedIds || [])])
      );
      const mergedUnlockedPromptIds = Array.from(
        new Set([...(existingData.unlockedPromptIds || []), ...(data.unlockedPromptIds || [])])
      );

      // Safe Tool Credits (maintain balance, never drop to 0 unexpectedly)
      const resolvedToolCredits = data.toolCredits !== undefined
        ? Number(data.toolCredits)
        : (existingData.toolCredits !== undefined ? Number(existingData.toolCredits) : 2);

      // Safe Plan Tier resolution (vip > pro > starter > free)
      const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3 };
      const currentTier = existingData.planTier || (existingData.isProUser ? 'pro' : 'free');
      const incomingTier = data.planTier;
      let resolvedPlanTier = currentTier;
      if (incomingTier && TIER_RANK[incomingTier] !== undefined) {
        if (TIER_RANK[incomingTier] >= (TIER_RANK[currentTier] || 0) || !existingData.planTier) {
          resolvedPlanTier = incomingTier;
        }
      }
      let resolvedIsPro = resolvedPlanTier !== 'free' || Boolean(data.isProUser ?? existingData.isProUser);

      // Strict Correctness: Any user with credits > 2 or paid status is marked Pro/Paid
      if (resolvedToolCredits > 2 || resolvedIsPro || (resolvedPlanTier && resolvedPlanTier !== 'free')) {
        resolvedIsPro = true;
        if (resolvedPlanTier === 'free') {
          resolvedPlanTier = resolvedToolCredits >= 499 ? 'vip' : (resolvedToolCredits >= 250 ? 'pro' : 'starter');
        }
      }

      // Merge aiHistory safely
      let mergedAiHistory = existingData.aiHistory || [];
      if (Array.isArray(data.aiHistory)) {
        const historyMap = new Map();
        for (const it of (existingData.aiHistory || [])) {
          if (it && it.id) historyMap.set(it.id, it);
        }
        for (const it of data.aiHistory) {
          if (it && it.id) historyMap.set(it.id, it);
        }
        mergedAiHistory = Array.from(historyMap.values())
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 100);
      }

      // Merge tasteProfile if provided
      let mergedTasteProfile = existingData.tasteProfile;
      if (data.tasteProfile) {
        if (!existingData.tasteProfile) {
          mergedTasteProfile = data.tasteProfile;
        } else {
          // Merge taste profile settings and affinities
          const existingTP = existingData.tasteProfile;
          const incomingTP = data.tasteProfile;

          mergedTasteProfile = {
            ...existingTP,
            ...incomingTP,
            genderVibe: incomingTP.genderVibe || existingTP.genderVibe || 'all',
            favoriteStyles: Array.isArray(incomingTP.favoriteStyles)
              ? incomingTP.favoriteStyles
              : existingTP.favoriteStyles || [],
            favoriteTools: Array.isArray(incomingTP.favoriteTools)
              ? incomingTP.favoriteTools
              : existingTP.favoriteTools || [],
            categoryAffinities: {
              ...(existingTP.categoryAffinities || {}),
              ...(incomingTP.categoryAffinities || {}),
            },
            tagAffinities: {
              ...(existingTP.tagAffinities || {}),
              ...(incomingTP.tagAffinities || {}),
            },
            toolAffinities: {
              ...(existingTP.toolAffinities || {}),
              ...(incomingTP.toolAffinities || {}),
            },
            clickedPostIds: {
              ...(existingTP.clickedPostIds || {}),
              ...(incomingTP.clickedPostIds || {}),
            },
            copiedPostIds: Array.from(
              new Set([...(existingTP.copiedPostIds || []), ...(incomingTP.copiedPostIds || [])])
            ).slice(0, 50),
            lastUpdated: incomingTP.lastUpdated || new Date().toISOString(),
          };
        }
      }

      const mergedPayload = {
        ...existingData,
        ...data,
        bookmarkedIds: data.bookmarkedIds !== undefined ? data.bookmarkedIds : mergedBookmarks,
        likedIds: data.likedIds !== undefined ? data.likedIds : mergedLikes,
        unlockedPromptIds: data.unlockedPromptIds !== undefined ? data.unlockedPromptIds : mergedUnlockedPromptIds,
        planTier: resolvedPlanTier,
        isProUser: resolvedIsPro,
        toolCredits: resolvedToolCredits,
        aiHistory: mergedAiHistory,
        tasteProfile: mergedTasteProfile !== undefined ? mergedTasteProfile : existingData.tasteProfile,
        userId: userId || existingData.userId,
        email: email || existingData.email,
        updatedAt: new Date().toISOString(),
      };

      const { error: upsertError } = await client
        .from('settings')
        .upsert({ id: key, data: mergedPayload });

      if (upsertError) {
        console.error('User sync upsert error:', upsertError);
        return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
      }

      // Also mirror to email key if available for multi-device cross-resolution
      if (email) {
        const emailKey = getSyncKey(undefined, email);
        if (emailKey !== key) {
          await client.from('settings').upsert({ id: emailKey, data: mergedPayload });
        }
      }

      return NextResponse.json({ success: true, syncData: mergedPayload });
    }

    // 3. BOOKMARK TOGGLE
    if (action === 'toggle_bookmark') {
      const { postId, isBookmarked } = data || {};
      if (!postId) return NextResponse.json({ success: false, error: 'postId required' }, { status: 400 });

      const { data: existingRow } = await client
        .from('settings')
        .select('*')
        .eq('id', key)
        .single();

      const existingData = existingRow?.data || {};
      const currentList: string[] = Array.isArray(existingData.bookmarkedIds) ? existingData.bookmarkedIds : [];

      let updatedList: string[];
      if (isBookmarked) {
        updatedList = Array.from(new Set([...currentList, postId]));
      } else {
        updatedList = currentList.filter((id) => id !== postId);
      }

      const mergedPayload = {
        ...existingData,
        bookmarkedIds: updatedList,
        userId: userId || existingData.userId,
        email: email || existingData.email,
        updatedAt: new Date().toISOString(),
      };

      await client.from('settings').upsert({ id: key, data: mergedPayload });

      if (email) {
        const emailKey = getSyncKey(undefined, email);
        if (emailKey !== key) {
          await client.from('settings').upsert({ id: emailKey, data: mergedPayload });
        }
      }

      return NextResponse.json({ success: true, bookmarkedIds: updatedList });
    }

    // 4. TASTE PROFILE UPDATE
    if (action === 'update_taste_profile') {
      const incomingProfile = data?.tasteProfile || data;
      if (!incomingProfile || typeof incomingProfile !== 'object') {
        return NextResponse.json({ success: false, error: 'tasteProfile data required' }, { status: 400 });
      }

      const { data: existingRow } = await client
        .from('settings')
        .select('*')
        .eq('id', key)
        .single();

      const existingData = existingRow?.data || {};
      const existingTP = existingData.tasteProfile || {};

      const mergedTasteProfile = {
        ...existingTP,
        ...incomingProfile,
        genderVibe: incomingProfile.genderVibe || existingTP.genderVibe || 'all',
        favoriteStyles: Array.isArray(incomingProfile.favoriteStyles)
          ? incomingProfile.favoriteStyles
          : existingTP.favoriteStyles || [],
        favoriteTools: Array.isArray(incomingProfile.favoriteTools)
          ? incomingProfile.favoriteTools
          : existingTP.favoriteTools || [],
        categoryAffinities: {
          ...(existingTP.categoryAffinities || {}),
          ...(incomingProfile.categoryAffinities || {}),
        },
        tagAffinities: {
          ...(existingTP.tagAffinities || {}),
          ...(incomingProfile.tagAffinities || {}),
        },
        toolAffinities: {
          ...(existingTP.toolAffinities || {}),
          ...(incomingProfile.toolAffinities || {}),
        },
        clickedPostIds: {
          ...(existingTP.clickedPostIds || {}),
          ...(incomingProfile.clickedPostIds || {}),
        },
        copiedPostIds: Array.from(
          new Set([...(existingTP.copiedPostIds || []), ...(incomingProfile.copiedPostIds || [])])
        ).slice(0, 50),
        lastUpdated: incomingProfile.lastUpdated || new Date().toISOString(),
      };

      const mergedPayload = {
        ...existingData,
        tasteProfile: mergedTasteProfile,
        userId: userId || existingData.userId,
        email: email || existingData.email,
        updatedAt: new Date().toISOString(),
      };

      await client.from('settings').upsert({ id: key, data: mergedPayload });

      if (email) {
        const emailKey = getSyncKey(undefined, email);
        if (emailKey !== key) {
          await client.from('settings').upsert({ id: emailKey, data: mergedPayload });
        }
      }

      return NextResponse.json({ success: true, tasteProfile: mergedTasteProfile });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('User sync API error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
