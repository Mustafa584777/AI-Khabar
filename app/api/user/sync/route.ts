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

    // Helper: Check active permanent subscription across ServerStorage and Supabase
    let activeSub: any = null;
    if (cleanEmail) {
      try {
        activeSub = await ServerStorage.getUserSubscription(cleanEmail);
      } catch (e) {
        console.warn('ServerStorage subscription check warning:', e);
      }

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
        const qpCfg = PLAN_CONFIGS[qp.planTier as PlanTier] || PLAN_CONFIGS.pro;
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

    // Helper: fetch existing row checking emailKey, userKey, subscriptions, and server backups
    const fetchExistingData = async () => {
      const candidates: any[] = [];

      // 1. Check ServerStorage profile backup
      if (cleanEmail || userId) {
        try {
          const storedProfile = await ServerStorage.getUserProfile(cleanEmail, userId);
          if (storedProfile) candidates.push(storedProfile);
        } catch (e) {
          console.warn('ServerStorage profile check warning:', e);
        }
      }

      // 3. Check Supabase by emailKey
      if (emailKey) {
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', emailKey)
          .maybeSingle();
        if (row?.data) candidates.push(row.data);
      }

      // 4. Check Supabase by userKey
      if (userKey && userKey !== emailKey) {
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', userKey)
          .maybeSingle();
        if (row?.data) candidates.push(row.data);
      }

      // 5. Check Supabase by jsonb filter (filtering only user_sync_ records)
      if (cleanEmail) {
        const { data: rows } = await client
          .from('settings')
          .select('id, data')
          .filter('data->>email', 'eq', cleanEmail);
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r?.data && typeof r.data === 'object' && r.id?.startsWith('user_sync_')) {
              candidates.push(r.data);
            }
          }
        }
      }

      if (candidates.length === 0) {
        if (hasActiveSub) {
          return {
            email: cleanEmail,
            userId,
            planTier: activeSub.planTier,
            isProUser: true,
            toolCredits: activeSub.credits,
            aiSearchRemaining: activeSub.aiSearchQuota,
            promptRequestsRemaining: activeSub.promptRequests,
            planStartedAt: activeSub.planStartedAt,
            planExpiresAt: activeSub.planExpiresAt,
            bookmarkedIds: [],
            likedIds: [],
            unlockedPromptIds: [],
            aiHistory: [],
            updatedAt: new Date().toISOString(),
          };
        }
        return null;
      }

      // Sort by updatedAt descending to prioritize latest saved state
      candidates.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });

      const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };

      // Determine highest active unexpired plan tier
      let highestTier: PlanTier = hasActiveSub ? (activeSub.planTier as PlanTier) : 'free';
      let highestStartedAt = hasActiveSub ? activeSub.planStartedAt : undefined;
      let highestExpiresAt = hasActiveSub ? activeSub.planExpiresAt : undefined;

      for (const curr of candidates) {
        const currTier = (curr.planTier && curr.planTier in PLAN_CONFIGS && curr.planTier !== 'free')
          ? (curr.planTier as PlanTier)
          : 'free';
        const hasValidExpiry = Boolean(
          curr.planExpiresAt &&
          !isNaN(new Date(curr.planExpiresAt).getTime()) &&
          new Date(curr.planExpiresAt).getTime() > Date.now()
        );
        const effCurrTier: PlanTier = (currTier !== 'free' && (hasValidExpiry || hasActiveSub)) ? currTier : 'free';

        if ((TIER_RANK[effCurrTier] || 0) > (TIER_RANK[highestTier] || 0)) {
          highestTier = effCurrTier;
          highestStartedAt = curr.planStartedAt || highestStartedAt;
          highestExpiresAt = curr.planExpiresAt || highestExpiresAt;
        }
      }

      // Pick matching candidate with highestTier to retrieve exact consumed balance
      const matchingCandidate = candidates.find(c => {
        const t = (c.planTier && c.planTier in PLAN_CONFIGS) ? c.planTier : (c.isProUser ? 'pro' : 'free');
        return t === highestTier;
      }) || candidates[0];

      let best = { ...matchingCandidate };

      // Merge bookmarks, unlocked prompts, liked IDs uniquely across all candidates
      for (const curr of candidates) {
        best.bookmarkedIds = Array.from(new Set([...(best.bookmarkedIds || []), ...(curr.bookmarkedIds || [])]));
        best.unlockedPromptIds = Array.from(new Set([...(best.unlockedPromptIds || []), ...(curr.unlockedPromptIds || [])]));
        best.likedIds = Array.from(new Set([...(best.likedIds || []), ...(curr.likedIds || [])]));
      }

      best.planTier = highestTier;
      best.isProUser = highestTier !== 'free' || Boolean(best.isProUser || hasActiveSub);
      best.planStartedAt = highestStartedAt || best.planStartedAt;
      best.planExpiresAt = highestExpiresAt || best.planExpiresAt;
      best.queuedPlan = activeSub?.queuedPlan || best.queuedPlan || null;

      // Check if plan has expired: if a queued plan exists, automatically activate it!
      const isPlanExpired = Boolean(best.planExpiresAt && new Date(best.planExpiresAt).getTime() <= Date.now());
      if (isPlanExpired && best.queuedPlan) {
        const qp = best.queuedPlan;
        const qpCfg = getPlanFeaturesForCycle(qp.planTier as PlanTier, qp.billingCycle || 'monthly');
        best.planTier = qp.planTier;
        best.isProUser = true;
        best.planStartedAt = qp.scheduledStartAt || new Date().toISOString();
        best.planExpiresAt = qp.scheduledExpiresAt;
        // Rule 2: Credits never expire or overwrite; add queued plan credits
        best.toolCredits = (Number(best.toolCredits) || 0) + (qp.credits || qpCfg.credits);
        best.promptRequestsRemaining = qp.promptRequests || qpCfg.promptRequests;
        best.aiSearchRemaining = qpCfg.unlimitedSearches ? 999999 : (qp.aiSearchQuota || qpCfg.aiSearchQuota);
        best.savesLimit = qpCfg.savesLimit;
        best.queuedPlan = null;
      } else if (isPlanExpired && best.planTier !== 'free') {
        // Demote to free account without loss of any data (Rule 4 & 7)
        best.planTier = 'free';
        best.isProUser = false;
        best.promptRequestsRemaining = 0; // Rule 7: prompt request 0 ho jayegi
        best.aiSearchRemaining = 5; // Rule 7: ai searches 5/5 per set ho jayegi
        best.savesLimit = 10; // Rule 7: saves limit free tier ke 10 saves tak reset ho jayegi
        // best.toolCredits stays intact!
      }

      const isYearly = Boolean(
        best.billingCycle === 'yearly' ||
        (best.planExpiresAt && best.planStartedAt && (new Date(best.planExpiresAt).getTime() - new Date(best.planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
      );
      const planCfg = getPlanFeaturesForCycle(best.planTier as PlanTier, isYearly ? 'yearly' : 'monthly');

      // Strictly preserve consumed balance! Free users get 5 credits ONLY ONCE on initial account creation.
      if (best.toolCredits === undefined || best.toolCredits === null) {
        best.toolCredits = best.planTier === 'free' ? 5 : planCfg.credits;
      } else {
        best.toolCredits = Number(best.toolCredits);
      }

      // If user is on free tier, has 0 unlocked prompts, 0 ai history, and has 0 credits (e.g. from previous bug), heal them to 5:
      if (
        best.toolCredits === 0 &&
        (!best.unlockedPromptIds || best.unlockedPromptIds.length === 0) &&
        (!best.aiHistory || best.aiHistory.length === 0) &&
        best.planTier === 'free'
      ) {
        best.toolCredits = 5;
      }

      const submittedRequestsCount = Array.isArray(best.promptRequests) ? best.promptRequests.length : 0;
      if (best.planTier !== 'free') {
        if (
          best.promptRequestsRemaining === undefined ||
          best.promptRequestsRemaining === null ||
          (Number(best.promptRequestsRemaining) === 0 && submittedRequestsCount === 0)
        ) {
          best.promptRequestsRemaining = planCfg.promptRequests;
        } else {
          best.promptRequestsRemaining = Number(best.promptRequestsRemaining);
        }
      } else {
        best.promptRequestsRemaining = 0;
      }

      if (planCfg.unlimitedSearches) {
        best.aiSearchRemaining = 999999;
      } else if (best.aiSearchRemaining === undefined || best.aiSearchRemaining === null) {
        best.aiSearchRemaining = planCfg.aiSearchQuota;
      } else {
        best.aiSearchRemaining = Number(best.aiSearchRemaining);
      }

      return best;
    };

    // 1. PULL: Retrieve synced data for user
    if (action === 'pull' || !action) {
      let syncData = await fetchExistingData();

      // Mirror to both emailKey and userKey to prevent desync
      if (syncData) {
        if (emailKey) {
          try {
            await client.from('settings').upsert({ id: emailKey, data: syncData }, { onConflict: 'id' });
          } catch {}
        }
        if (userKey && userKey !== emailKey) {
          try {
            await client.from('settings').upsert({ id: userKey, data: syncData }, { onConflict: 'id' });
          } catch {}
        }
      }

      if (syncData) {
        const cloned = { ...syncData };
        let tier = (cloned.planTier && cloned.planTier in PLAN_CONFIGS && cloned.planTier !== 'free')
          ? cloned.planTier
          : 'free';

        // Check if plan has expired or lacks expiration (never expire if user holds active subscription)
        if (tier !== 'free' && !hasActiveSub) {
          const exp = cloned.planExpiresAt ? new Date(cloned.planExpiresAt).getTime() : 0;
          if (!exp || isNaN(exp) || exp <= Date.now()) {
            if (cloned.queuedPlan) {
              const qp = cloned.queuedPlan;
              const qpCfg = getPlanFeaturesForCycle(qp.planTier as PlanTier, qp.billingCycle || 'monthly');
              tier = qp.planTier;
              cloned.isProUser = true;
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

        cloned.planTier = tier;
        cloned.isProUser = tier !== 'free' || Boolean(cloned.isProUser);

        // DO NOT overwrite consumed balance with plan initial quota on pull!
        const isYearly = Boolean(
          cloned.billingCycle === 'yearly' ||
          (cloned.planExpiresAt && cloned.planStartedAt && (new Date(cloned.planExpiresAt).getTime() - new Date(cloned.planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
        );
        const planCfg = getPlanFeaturesForCycle(tier as PlanTier, isYearly ? 'yearly' : 'monthly');
        if (planCfg.unlimitedSearches) {
          cloned.aiSearchRemaining = 999999;
        } else if (cloned.aiSearchRemaining !== undefined && cloned.aiSearchRemaining !== null) {
          cloned.aiSearchRemaining = Number(cloned.aiSearchRemaining);
        }

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

      // Safe Plan Tier resolution (vip > pro > starter > free)
      const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };
      const currentTier: PlanTier = (existingData.planTier && existingData.planTier in PLAN_CONFIGS && existingData.planTier !== 'free')
        ? (existingData.planTier as PlanTier)
        : 'free';
      const incomingTier = data.planTier;
      let resolvedPlanTier: PlanTier = currentTier;

      // Check if current tier is paid and unexpired
      const isCurrentPaidAndActive = currentTier !== 'free' && Boolean(
        existingData.planExpiresAt &&
        !isNaN(new Date(existingData.planExpiresAt).getTime()) &&
        new Date(existingData.planExpiresAt).getTime() > Date.now()
      );

      if (hasActiveSub && activeSub) {
        resolvedPlanTier = activeSub.planTier;
      } else if (isCurrentPaidAndActive) {
        // If user already holds an active paid plan, do NOT let it get downgraded to free by a push
        if (incomingTier && (TIER_RANK[incomingTier] || 0) > (TIER_RANK[currentTier] || 0)) {
          resolvedPlanTier = incomingTier;
        } else {
          resolvedPlanTier = currentTier;
        }
      } else if (incomingTier && TIER_RANK[incomingTier] !== undefined) {
        // Only accept incoming paid tier if user has activeSub OR incoming has valid future expiration
        if (incomingTier === 'free') {
          resolvedPlanTier = 'free';
        } else if (hasActiveSub || (data.planExpiresAt && new Date(data.planExpiresAt).getTime() > Date.now())) {
          resolvedPlanTier = incomingTier;
        } else {
          resolvedPlanTier = 'free';
        }
      } else {
        resolvedPlanTier = 'free';
      }

      let resolvedIsPro = resolvedPlanTier !== 'free' || Boolean(hasActiveSub);

      // Check plan expiration if provided
      const resolvedPlanExpiresAt = activeSub?.planExpiresAt || data.planExpiresAt || existingData.planExpiresAt;
      if (resolvedPlanTier !== 'free' && !hasActiveSub) {
        const exp = resolvedPlanExpiresAt ? new Date(resolvedPlanExpiresAt).getTime() : 0;
        if (!exp || isNaN(exp) || exp <= Date.now()) {
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

      const planCfg = PLAN_CONFIGS[resolvedPlanTier as PlanTier] || PLAN_CONFIGS.free;

      // Tool credits: strictly preserve consumed or updated balance
      let resolvedToolCredits: number;
      if (data.toolCredits !== undefined) {
        resolvedToolCredits = Number(data.toolCredits);
      } else if (existingData.toolCredits !== undefined && existingData.toolCredits !== null) {
        resolvedToolCredits = Number(existingData.toolCredits);
      } else {
        resolvedToolCredits = resolvedPlanTier === 'free' ? 5 : planCfg.credits;
      }

      // Prompt requests: strictly preserve consumed count (do NOT force Math.max)
      let finalRequests: number;
      const submittedRequestsCount = Array.isArray(existingData.promptRequests) ? existingData.promptRequests.length : 0;
      if (resolvedPlanTier !== 'free') {
        if (data.promptRequestsRemaining !== undefined && Number(data.promptRequestsRemaining) > 0) {
          finalRequests = Number(data.promptRequestsRemaining);
        } else if (existingData.promptRequestsRemaining !== undefined && existingData.promptRequestsRemaining !== null && Number(existingData.promptRequestsRemaining) > 0) {
          finalRequests = Number(existingData.promptRequestsRemaining);
        } else {
          finalRequests = Math.max(0, planCfg.promptRequests - submittedRequestsCount);
        }
      } else {
        finalRequests = 0;
      }

      // AI searches: strictly preserve consumed searches
      let finalSearches: number;
      if (planCfg.unlimitedSearches) {
        finalSearches = 999999;
      } else if (data.aiSearchRemaining !== undefined) {
        finalSearches = Math.min(Number(data.aiSearchRemaining), planCfg.aiSearchQuota);
      } else if (existingData.aiSearchRemaining !== undefined && existingData.aiSearchRemaining !== null) {
        finalSearches = Math.min(Number(existingData.aiSearchRemaining), planCfg.aiSearchQuota);
      } else {
        finalSearches = planCfg.aiSearchQuota;
      }

      const mergedPayload = {
        ...existingData,
        ...data,
        email: cleanEmail || existingData.email,
        userId: userId || existingData.userId,
        bookmarkedIds: mergedBookmarks,
        likedIds: mergedLikes,
        unlockedPromptIds: mergedUnlockedPromptIds,
        planTier: resolvedPlanTier,
        isProUser: resolvedIsPro,
        toolCredits: resolvedToolCredits,
        promptRequestsRemaining: finalRequests,
        aiSearchRemaining: finalSearches,
        aiHistory: mergedAiHistory,
        tasteProfile: mergedTasteProfile !== undefined ? mergedTasteProfile : existingData.tasteProfile,
        planStartedAt: data.planStartedAt || existingData.planStartedAt,
        planExpiresAt: resolvedPlanExpiresAt,
        queuedPlan: data.queuedPlan !== undefined ? data.queuedPlan : (existingData.queuedPlan || activeSub?.queuedPlan || null),
        updatedAt: new Date().toISOString(),
      };

      // 1. Primary Save: Local server-storage persistent backup
      try {
        await ServerStorage.saveUserProfile(cleanEmail, userId, mergedPayload);
      } catch (e) {
        console.error('ServerStorage saveUserProfile error:', e);
      }

      // 2. Save to Supabase emailKey if email is provided
      if (emailKey) {
        const { error: emailUpsertError } = await client
          .from('settings')
          .upsert({ id: emailKey, data: mergedPayload }, { onConflict: 'id' });

        if (emailUpsertError) {
          console.error('User sync email upsert error:', emailUpsertError);
        }
      }

      // 3. Secondary Mirror: Save to userKey if provided
      if (userKey && userKey !== emailKey) {
        const { error: userUpsertError } = await client
          .from('settings')
          .upsert({ id: userKey, data: mergedPayload }, { onConflict: 'id' });

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
