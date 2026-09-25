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

    const cleanEmail = cleanEmailString(email || data?.email);
    const emailKey = cleanEmail ? getEmailKey(cleanEmail) : '';
    const userKey = userId ? getUserKey(userId) : '';

    if (!emailKey && !userKey) {
      return NextResponse.json(
        { success: false, error: 'User Email or User ID is required to save and sync data' },
        { status: 400 }
      );
    }

    const client = supabaseAdmin || supabase;

    // Helper: fetch existing row checking emailKey and userKey and merging intelligently
    const fetchExistingData = async () => {
      const candidates: any[] = [];
      if (emailKey) {
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', emailKey)
          .single();
        if (row?.data) candidates.push(row.data);
      }
      if (userKey && userKey !== emailKey) {
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', userKey)
          .single();
        if (row?.data) candidates.push(row.data);
      }
      if (cleanEmail) {
        const { data: rows } = await client
          .from('settings')
          .select('data')
          .ilike('id', `%${cleanEmail.replace(/[^a-z0-9]/g, '_')}%`);
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r?.data && !candidates.includes(r.data)) {
              candidates.push(r.data);
            }
          }
        }
      }

      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];

      // Merge candidates taking highest credits and best plan tier
      const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };
      let best = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        const curr = candidates[i];
        const bestTier = best.planTier || (best.isProUser ? 'pro' : 'free');
        const currTier = curr.planTier || (curr.isProUser ? 'pro' : 'free');
        if ((TIER_RANK[currTier] || 0) > (TIER_RANK[bestTier] || 0)) {
          best = { ...best, ...curr, planTier: currTier, isProUser: curr.isProUser };
        }
        if ((curr.toolCredits || 0) > (best.toolCredits || 0)) {
          best.toolCredits = curr.toolCredits;
        }
        if ((curr.points || 0) > (best.points || 0)) {
          best.points = curr.points;
        }
        best.bookmarkedIds = Array.from(new Set([...(best.bookmarkedIds || []), ...(curr.bookmarkedIds || [])]));
        best.unlockedPromptIds = Array.from(new Set([...(best.unlockedPromptIds || []), ...(curr.unlockedPromptIds || [])]));
        best.likedIds = Array.from(new Set([...(best.likedIds || []), ...(curr.likedIds || [])]));
      }
      return best;
    };

    // 1. PULL: Retrieve synced data for user
    if (action === 'pull' || !action) {
      let syncData = await fetchExistingData();

      // If found under userKey but not yet mirrored to emailKey, backfill immediately
      if (syncData && emailKey) {
        try {
          await client.from('settings').upsert({ id: emailKey, data: syncData });
        } catch {}
      }

      if (syncData) {
        const cloned = { ...syncData };
        let tier = cloned.planTier || (cloned.isProUser ? 'pro' : 'free');

        // Check if plan has expired
        if (tier !== 'free' && cloned.planExpiresAt) {
          const exp = new Date(cloned.planExpiresAt).getTime();
          if (!isNaN(exp) && exp < Date.now()) {
            tier = 'free';
            cloned.isProUser = false;
          }
        }

        cloned.planTier = tier;
        cloned.isProUser = tier !== 'free' || Boolean(cloned.isProUser);

        return NextResponse.json({
          success: true,
          syncData: cloned,
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

      // Fetch existing data to safely merge without overwriting existing achievements/credits
      const existingData = (await fetchExistingData()) || {};

      // Merge bookmarks uniquely
      const mergedBookmarks = Array.from(
        new Set([...(existingData.bookmarkedIds || []), ...(data.bookmarkedIds || [])])
      );
      // Merge likes uniquely
      const mergedLikes = Array.from(
        new Set([...(existingData.likedIds || []), ...(data.likedIds || [])])
      );
      // Merge unlocked prompts uniquely
      const mergedUnlockedPromptIds = Array.from(
        new Set([...(existingData.unlockedPromptIds || []), ...(data.unlockedPromptIds || [])])
      );

      // Safe Tool Credits (maintain balance, never drop unexpectedly)
      let incomingCredits = data.toolCredits !== undefined ? Number(data.toolCredits) : undefined;
      let existingCredits = existingData.toolCredits !== undefined ? Number(existingData.toolCredits) : 5;
      let resolvedToolCredits = existingCredits;
      if (incomingCredits !== undefined) {
        if (existingCredits > 5 && incomingCredits === 5) {
          resolvedToolCredits = existingCredits;
        } else if (incomingCredits < existingCredits && (existingCredits - incomingCredits) > 5) {
          resolvedToolCredits = Math.max(incomingCredits, existingCredits);
        } else {
          resolvedToolCredits = incomingCredits;
        }
      }

      // Safe Plan Tier resolution (vip > pro > starter > free)
      const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };
      const currentTier = existingData.planTier || (existingData.isProUser ? 'pro' : 'free');
      const incomingTier = data.planTier;
      let resolvedPlanTier = currentTier;
      if (incomingTier && TIER_RANK[incomingTier] !== undefined) {
        resolvedPlanTier = incomingTier;
      }
      let resolvedIsPro = resolvedPlanTier !== 'free' || Boolean(data.isProUser ?? existingData.isProUser);

      // Check plan expiration if provided
      const resolvedPlanExpiresAt = data.planExpiresAt || existingData.planExpiresAt;
      if (resolvedPlanTier !== 'free' && resolvedPlanExpiresAt) {
        const exp = new Date(resolvedPlanExpiresAt).getTime();
        if (!isNaN(exp) && exp < Date.now()) {
          resolvedPlanTier = 'free';
          resolvedIsPro = false;
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
        email: cleanEmail || existingData.email,
        userId: userId || existingData.userId,
        bookmarkedIds: data.bookmarkedIds !== undefined ? data.bookmarkedIds : mergedBookmarks,
        likedIds: data.likedIds !== undefined ? data.likedIds : mergedLikes,
        unlockedPromptIds: data.unlockedPromptIds !== undefined ? data.unlockedPromptIds : mergedUnlockedPromptIds,
        planTier: resolvedPlanTier,
        isProUser: resolvedIsPro,
        toolCredits: resolvedToolCredits,
        aiHistory: mergedAiHistory,
        tasteProfile: mergedTasteProfile !== undefined ? mergedTasteProfile : existingData.tasteProfile,
        planStartedAt: data.planStartedAt || existingData.planStartedAt,
        planExpiresAt: resolvedPlanExpiresAt,
        updatedAt: new Date().toISOString(),
      };

      // 1. Primary Save: Always save to emailKey if email is provided
      if (emailKey) {
        const { error: emailUpsertError } = await client
          .from('settings')
          .upsert({ id: emailKey, data: mergedPayload });

        if (emailUpsertError) {
          console.error('User sync email upsert error:', emailUpsertError);
        }
      }

      // 2. Secondary Mirror: Save to userKey if provided
      if (userKey && userKey !== emailKey) {
        const { error: userUpsertError } = await client
          .from('settings')
          .upsert({ id: userKey, data: mergedPayload });

        if (userUpsertError) {
          console.error('User sync user upsert error:', userUpsertError);
        }
      }

      return NextResponse.json({ success: true, syncData: mergedPayload });
    }

    // 3. BOOKMARK TOGGLE
    if (action === 'toggle_bookmark') {
      const { postId, isBookmarked } = data || {};
      if (!postId) return NextResponse.json({ success: false, error: 'postId required' }, { status: 400 });

      const existingData = (await fetchExistingData()) || {};
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
        email: cleanEmail || existingData.email,
        updatedAt: new Date().toISOString(),
      };

      if (emailKey) {
        await client.from('settings').upsert({ id: emailKey, data: mergedPayload });
      }
      if (userKey && userKey !== emailKey) {
        await client.from('settings').upsert({ id: userKey, data: mergedPayload });
      }

      return NextResponse.json({ success: true, bookmarkedIds: updatedList });
    }

    // 4. TASTE PROFILE UPDATE
    if (action === 'update_taste_profile') {
      const incomingProfile = data?.tasteProfile || data;
      if (!incomingProfile || typeof incomingProfile !== 'object') {
        return NextResponse.json({ success: false, error: 'tasteProfile data required' }, { status: 400 });
      }

      const existingData = (await fetchExistingData()) || {};
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
        email: cleanEmail || existingData.email,
        updatedAt: new Date().toISOString(),
      };

      if (emailKey) {
        await client.from('settings').upsert({ id: emailKey, data: mergedPayload });
      }
      if (userKey && userKey !== emailKey) {
        await client.from('settings').upsert({ id: userKey, data: mergedPayload });
      }

      return NextResponse.json({ success: true, tasteProfile: mergedTasteProfile });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('User sync API error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
