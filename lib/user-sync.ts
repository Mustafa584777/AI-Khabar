import { UserAccount, AIHistoryItem, PlanTier, PromptRequestItem, QueuedPlan } from '@/types/prompt';
import { INITIAL_TASTE_PROFILE, UserTasteProfile } from './personalization';
import { PLAN_CONFIGS, calculatePlanDates, getPlanFeaturesForCycle } from './plans';

export interface UserSyncData {
  userId?: string;
  email?: string;
  name?: string;
  avatar?: string;
  points?: number;
  bookmarkedIds?: string[];
  likedIds?: string[];
  aiHistory?: AIHistoryItem[];
  tasteProfile?: UserTasteProfile;
  planTier?: PlanTier;
  isProUser?: boolean;
  toolCredits?: number;
  aiSearchRemaining?: number;
  lastDailyCreditDate?: string;
  promptRequestsRemaining?: number;
  unlockedPromptIds?: string[];
  signupBonusClaimed?: boolean;
  signupModalShown?: boolean;
  billingCycle?: 'monthly' | 'yearly';
  signupCreditsAwarded?: boolean;
  savesLimit?: number;
  planStartedAt?: string;
  planExpiresAt?: string;
  queuedPlan?: QueuedPlan | null;
  queuedPlans?: QueuedPlan[];
  promptRequests?: PromptRequestItem[];
  joinedDate?: string;
  updatedAt?: string;
}

const TIER_WEIGHT: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  vip: 3,
  ultra: 4,
};

export const UserSyncService = {
  /**
   * Pull user data from Supabase cloud storage (database)
   */
  pullUserData: async (userId?: string, email?: string): Promise<UserSyncData | null> => {
    if (!userId && !email) return null;
    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pull',
          userId,
          email,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.syncData || null;
      }
    } catch (e) {
      console.warn('UserSyncService: Pull notice:', e);
    }
    return null;
  },

  /**
   * Push user state changes directly to Supabase cloud storage (database).
   * Automatically safeguards and includes active paid subscription from localStorage if not specified.
   */
  pushUserData: async (
    userId?: string,
    email?: string,
    data?: Partial<UserSyncData>
  ): Promise<boolean> => {
    if ((!userId && !email) || !data) return false;

    // Attach active paid plan details from localStorage if not explicitly provided
    const payload: Partial<UserSyncData> = { ...data };
    if (typeof window !== 'undefined') {
      const savedTier = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
      const isPaid = savedTier && ['starter', 'pro', 'vip', 'ultra'].includes(savedTier);
      const isProMember = localStorage.getItem('auraprompt_pro_member') === 'true' || isPaid;
      const savedExpires = localStorage.getItem('auraprompt_plan_expires_at');
      const savedStarted = localStorage.getItem('auraprompt_plan_started_at');
      const savedCredits = localStorage.getItem('auraprompt_tool_credits');

      if (isPaid && payload.planTier === undefined) {
        payload.planTier = savedTier;
      }
      if (isProMember && payload.isProUser === undefined) {
        payload.isProUser = true;
      }
      if (savedExpires && payload.planExpiresAt === undefined) {
        payload.planExpiresAt = savedExpires;
      }
      if (savedStarted && payload.planStartedAt === undefined) {
        payload.planStartedAt = savedStarted;
      }
      if (savedCredits !== null && payload.toolCredits === undefined) {
        const parsedCredits = parseInt(savedCredits, 10);
        if (!isNaN(parsedCredits)) payload.toolCredits = parsedCredits;
      }
    }

    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          userId,
          email,
          data: payload,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('UserSyncService: Push notice:', e);
      return false;
    }
  },

  /**
   * Specifically sync bookmarks to Supabase database
   */
  syncBookmarks: async (
    userId?: string,
    email?: string,
    bookmarkedIds?: string[]
  ): Promise<boolean> => {
    return UserSyncService.pushUserData(userId, email, { bookmarkedIds });
  },

  /**
   * Specifically sync taste profile to Supabase database
   */
  syncTasteProfile: async (
    userId?: string,
    email?: string,
    tasteProfile?: UserTasteProfile
  ): Promise<boolean> => {
    return UserSyncService.pushUserData(userId, email, { tasteProfile });
  },

  /**
   * Called whenever a user logs in or page refreshes.
   * STRICT GUARANTEE:
   * 1. Never downgrades an active, unexpired paid plan (starter, pro, vip, ultra) to free.
   * 2. If remote sync fails (rate limit, offline, timeout), preserves all local data without clearing.
   * 3. Merges bookmarks, liked IDs, unlocked prompts, and AI history non-destructively with union.
   */
  reconcileOnLogin: async (
    user: UserAccount
  ): Promise<{
    bookmarkedIds: string[];
    likedIds: string[];
    points: number;
    aiHistory: AIHistoryItem[];
    tasteProfile: UserTasteProfile;
    planTier: PlanTier;
    isProUser: boolean;
    toolCredits: number;
    aiSearchRemaining: number;
    promptRequestsRemaining: number;
    unlockedPromptIds: string[];
    planStartedAt?: string;
    planExpiresAt?: string;
    queuedPlan?: QueuedPlan | null;
  }> => {
    // 1. Gather all existing local client state
    let localTier: PlanTier = 'free';
    let localIsPro = false;
    let localCredits = 0;
    let localRequests = 0;
    let localSearches = 5;
    let localBookmarks: string[] = [];
    let localLikes: string[] = [];
    let localUnlocked: string[] = [];
    let localHistory: AIHistoryItem[] = [];
    let localTaste: UserTasteProfile = INITIAL_TASTE_PROFILE;
    let localPlanExpiresAt: string | undefined = undefined;
    let localPlanStartedAt: string | undefined = undefined;

    if (typeof window !== 'undefined') {
      try {
        const savedTier = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
        if (['starter', 'pro', 'vip', 'ultra', 'free'].includes(savedTier)) {
          localTier = savedTier;
        } else if ((user as any).planTier && ['starter', 'pro', 'vip', 'ultra'].includes((user as any).planTier)) {
          localTier = (user as any).planTier;
        }

        localIsPro = localStorage.getItem('auraprompt_pro_member') === 'true' || localTier !== 'free' || Boolean((user as any).isProUser);

        const savedCr = localStorage.getItem('auraprompt_tool_credits');
        if (savedCr !== null) {
          const parsed = parseInt(savedCr, 10);
          if (!isNaN(parsed)) localCredits = parsed;
        } else if (typeof (user as any).toolCredits === 'number') {
          localCredits = (user as any).toolCredits;
        }

        const savedReqs = localStorage.getItem('auraprompt_prompt_requests');
        if (savedReqs !== null) {
          const parsed = parseInt(savedReqs, 10);
          if (!isNaN(parsed)) localRequests = parsed;
        }

        const savedSrch = localStorage.getItem('auraprompt_ai_search_remaining');
        if (savedSrch !== null) {
          const parsed = parseInt(savedSrch, 10);
          if (!isNaN(parsed)) localSearches = parsed;
        }

        const savedUnlocks = localStorage.getItem('auraprompt_unlocked_prompts');
        if (savedUnlocks) {
          try {
            const parsed = JSON.parse(savedUnlocks);
            if (Array.isArray(parsed)) localUnlocked = parsed;
          } catch {}
        }

        const savedBm = localStorage.getItem('promptcms_user_bookmarks');
        if (savedBm) {
          try {
            const parsed = JSON.parse(savedBm);
            if (Array.isArray(parsed)) localBookmarks = parsed;
          } catch {}
        }

        const savedLk = localStorage.getItem('promptcms_user_likes');
        if (savedLk) {
          try {
            const parsed = JSON.parse(savedLk);
            if (Array.isArray(parsed)) localLikes = parsed;
          } catch {}
        }

        const savedHist = localStorage.getItem('promptcms_ai_history');
        if (savedHist) {
          try {
            const parsed = JSON.parse(savedHist);
            if (Array.isArray(parsed)) localHistory = parsed;
          } catch {}
        }

        localPlanExpiresAt = localStorage.getItem('auraprompt_plan_expires_at') || (user as any).planExpiresAt || undefined;
        localPlanStartedAt = localStorage.getItem('auraprompt_plan_started_at') || (user as any).planStartedAt || undefined;
      } catch (e) {
        console.warn('Error reading local state in reconcileOnLogin:', e);
      }
    }

    // 2. Attempt to pull authoritative remote record
    const remote = await UserSyncService.pullUserData(user.id, user.email);

    if (!remote) {
      // Network failure, rate limit, or remote not created yet:
      // STRICT SAFETY: PRESERVE ALL LOCAL STATE! DO NOT OVERWRITE WITH EMPTY DEFAULTS!
      const isLocalPaid = localTier !== 'free';
      const isLocalExpired = localPlanExpiresAt && new Date(localPlanExpiresAt).getTime() < Date.now();
      const effectiveLocalTier: PlanTier = (isLocalPaid && !isLocalExpired) ? localTier : (isLocalPaid && isLocalExpired ? 'free' : localTier);
      const effectiveLocalPro = effectiveLocalTier !== 'free' || localIsPro;

      // If user had an active paid plan locally, re-push to server in background so server heals
      if (effectiveLocalTier !== 'free') {
        void UserSyncService.pushUserData(user.id, user.email, {
          planTier: effectiveLocalTier,
          isProUser: true,
          toolCredits: localCredits,
          promptRequestsRemaining: localRequests,
          aiSearchRemaining: localSearches,
          planStartedAt: localPlanStartedAt,
          planExpiresAt: localPlanExpiresAt,
          bookmarkedIds: localBookmarks,
          unlockedPromptIds: localUnlocked,
        });
      }

      return {
        bookmarkedIds: localBookmarks,
        likedIds: localLikes,
        points: user.points || 10,
        aiHistory: localHistory,
        tasteProfile: localTaste,
        planTier: effectiveLocalTier,
        isProUser: effectiveLocalPro,
        toolCredits: localCredits,
        aiSearchRemaining: localSearches,
        promptRequestsRemaining: localRequests,
        unlockedPromptIds: localUnlocked,
        planStartedAt: localPlanStartedAt,
        planExpiresAt: localPlanExpiresAt,
        queuedPlan: typeof window !== 'undefined' ? (() => {
          try {
            const raw = localStorage.getItem('auraprompt_queued_plan');
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })() : null,
      };
    }

    // 3. Remote account exists: Non-destructively reconcile remote with local
    // Evaluate remote plan and expiration
    let remoteTier: PlanTier = (remote.planTier && ['starter', 'pro', 'vip', 'ultra', 'free'].includes(remote.planTier))
      ? remote.planTier
      : (remote.isProUser ? 'pro' : 'free');
    const isRemoteExpired = remote.planExpiresAt && new Date(remote.planExpiresAt).getTime() < Date.now();
    if (remoteTier !== 'free' && isRemoteExpired) {
      remoteTier = 'free';
    }

    // Evaluate local plan and expiration
    const isLocalPaid = localTier !== 'free';
    const isLocalExpired = localPlanExpiresAt && new Date(localPlanExpiresAt).getTime() < Date.now();
    const effectiveLocalTier: PlanTier = (isLocalPaid && !isLocalExpired) ? localTier : 'free';

    // Resolved tier: Highest unexpired tier between remote and local
    const TIER_WEIGHT_LOCAL: Record<PlanTier, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };
    let resolvedTier: PlanTier = remoteTier;
    if (TIER_WEIGHT_LOCAL[effectiveLocalTier] > TIER_WEIGHT_LOCAL[remoteTier]) {
      resolvedTier = effectiveLocalTier;
    }
    let resolvedIsPro: boolean = resolvedTier !== 'free' || Boolean(remote.isProUser || localIsPro);

    const isYearly = Boolean(
      (remote as any).billingCycle === 'yearly' ||
      (remote.planExpiresAt && remote.planStartedAt && (new Date(remote.planExpiresAt).getTime() - new Date(remote.planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000) ||
      (localPlanExpiresAt && localPlanStartedAt && (new Date(localPlanExpiresAt).getTime() - new Date(localPlanStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
    );
    const planCfg = getPlanFeaturesForCycle(resolvedTier, isYearly ? 'yearly' : 'monthly');

    // Preserved Credits: strictly keep user's exact balance (never reset free users back to 5)
    let resolvedCredits = remote.toolCredits !== undefined && remote.toolCredits !== null
      ? Number(remote.toolCredits)
      : (localCredits > 0 ? localCredits : 0);
    if (resolvedTier !== 'free' && planCfg.credits > resolvedCredits && remote.toolCredits === undefined) {
      resolvedCredits = planCfg.credits;
    }

    let resolvedRequests = remote.promptRequestsRemaining !== undefined && remote.promptRequestsRemaining !== null
      ? Number(remote.promptRequestsRemaining)
      : Math.max(localRequests, resolvedTier !== 'free' ? planCfg.promptRequests : 0);
    if (localRequests > resolvedRequests && resolvedTier !== 'free') {
      resolvedRequests = localRequests;
    }

    let resolvedAiSearches: number;
    if (planCfg.unlimitedSearches) {
      resolvedAiSearches = 999999;
    } else if (remote.aiSearchRemaining !== undefined && remote.aiSearchRemaining !== null) {
      resolvedAiSearches = Math.min(Number(remote.aiSearchRemaining), planCfg.aiSearchQuota);
    } else {
      resolvedAiSearches = Math.max(localSearches, planCfg.aiSearchQuota);
    }

    // Non-destructive Union for Bookmarks, Liked IDs, and Unlocked Prompts (Never drop any saved item)
    const mergedBookmarks = Array.from(new Set([...localBookmarks, ...(Array.isArray(remote.bookmarkedIds) ? remote.bookmarkedIds : [])]));
    const mergedLikes = Array.from(new Set([...localLikes, ...(Array.isArray(remote.likedIds) ? remote.likedIds : [])]));
    const mergedUnlocked = Array.from(new Set([...localUnlocked, ...(Array.isArray(remote.unlockedPromptIds) ? remote.unlockedPromptIds : [])]));

    // Non-destructive AI History merge by ID
    const historyMap = new Map<string, AIHistoryItem>();
    localHistory.forEach((item) => {
      if (item && item.id) historyMap.set(item.id, item);
    });
    if (Array.isArray(remote.aiHistory)) {
      remote.aiHistory.forEach((item) => {
        if (item && item.id) historyMap.set(item.id, item);
      });
    }
    const mergedHistory = Array.from(historyMap.values())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 100);

    // Check queued plan from remote or local storage
    let activeQueuedPlan: QueuedPlan | null = remote.queuedPlan || null;
    if (!activeQueuedPlan && typeof window !== 'undefined') {
      try {
        const rawQueue = localStorage.getItem('auraprompt_queued_plan');
        if (rawQueue) activeQueuedPlan = JSON.parse(rawQueue);
      } catch {}
    }

    // Determine plan dates with strict preservation of historical start date
    let resolvedPlanStartedAt = remote.planStartedAt || localPlanStartedAt;
    let resolvedPlanExpiresAt = remote.planExpiresAt || localPlanExpiresAt;

    if (resolvedTier !== 'free') {
      if (!resolvedPlanStartedAt || !resolvedPlanExpiresAt) {
        const initDates = calculatePlanDates(resolvedPlanStartedAt || new Date(), 30);
        resolvedPlanStartedAt = resolvedPlanStartedAt || initDates.planStartedAt;
        resolvedPlanExpiresAt = resolvedPlanExpiresAt || initDates.planExpiresAt;
      }
    }

    // Check if the current plan has expired!
    const isPlanCurrentlyExpired = Boolean(
      resolvedPlanExpiresAt && new Date(resolvedPlanExpiresAt).getTime() <= Date.now()
    );

    if (isPlanCurrentlyExpired) {
      if (activeQueuedPlan) {
        // Automatically activate queued plan!
        const qp = activeQueuedPlan;
        const qpCfg = PLAN_CONFIGS[qp.planTier] || PLAN_CONFIGS.pro;
        resolvedTier = qp.planTier;
        resolvedIsPro = true;
        resolvedCredits = qp.credits || qpCfg.credits;
        resolvedRequests = qp.promptRequests || qpCfg.promptRequests;
        resolvedAiSearches = qpCfg.unlimitedSearches ? 999999 : (qp.aiSearchQuota || qpCfg.aiSearchQuota);
        resolvedPlanStartedAt = qp.scheduledStartAt || new Date().toISOString();
        resolvedPlanExpiresAt = qp.scheduledExpiresAt;
        activeQueuedPlan = null;
        if (typeof window !== 'undefined') localStorage.removeItem('auraprompt_queued_plan');
      } else {
        resolvedTier = 'free';
        resolvedIsPro = false;
      }
    }

    // Save consolidated state safely to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_plan_tier', resolvedTier);
      localStorage.setItem('auraprompt_pro_member', String(resolvedIsPro));
      localStorage.setItem('auraprompt_tool_credits', String(resolvedCredits));
      localStorage.setItem('auraprompt_prompt_requests', String(resolvedRequests));
      localStorage.setItem('auraprompt_ai_search_remaining', String(resolvedAiSearches));
      localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(mergedUnlocked));
      localStorage.setItem('promptcms_user_bookmarks', JSON.stringify(mergedBookmarks));
      localStorage.setItem('promptcms_user_likes', JSON.stringify(mergedLikes));
      localStorage.setItem('promptcms_ai_history', JSON.stringify(mergedHistory));
      localStorage.setItem('auraprompt_first_login_claimed', 'true');
      if (user.email) {
        localStorage.setItem(`auraprompt_signup_bonus_claimed_${user.email.toLowerCase().trim()}`, 'true');
      }
      if (resolvedPlanStartedAt) localStorage.setItem('auraprompt_plan_started_at', resolvedPlanStartedAt);
      if (resolvedPlanExpiresAt) localStorage.setItem('auraprompt_plan_expires_at', resolvedPlanExpiresAt);
      if (activeQueuedPlan) {
        localStorage.setItem('auraprompt_queued_plan', JSON.stringify(activeQueuedPlan));
      } else {
        localStorage.removeItem('auraprompt_queued_plan');
      }
    }

    // If local held newer/higher data (e.g. bookmarks or active plan), push back to remote to sync database
    const needsPushBack =
      mergedBookmarks.length > (remote.bookmarkedIds?.length || 0) ||
      mergedUnlocked.length > (remote.unlockedPromptIds?.length || 0) ||
      mergedHistory.length > (remote.aiHistory?.length || 0) ||
      (resolvedTier !== 'free' && remoteTier === 'free') ||
      Boolean(activeQueuedPlan && !remote.queuedPlan);

    if (needsPushBack) {
      void UserSyncService.pushUserData(user.id, user.email, {
        planTier: resolvedTier,
        isProUser: resolvedIsPro,
        toolCredits: resolvedCredits,
        promptRequestsRemaining: resolvedRequests,
        aiSearchRemaining: resolvedAiSearches,
        bookmarkedIds: mergedBookmarks,
        likedIds: mergedLikes,
        unlockedPromptIds: mergedUnlocked,
        aiHistory: mergedHistory,
        planStartedAt: resolvedPlanStartedAt,
        planExpiresAt: resolvedPlanExpiresAt,
        queuedPlan: activeQueuedPlan,
      });
    }

    return {
      bookmarkedIds: mergedBookmarks,
      likedIds: mergedLikes,
      points: remote.points !== undefined ? Number(remote.points) : (user.points || 10),
      aiHistory: mergedHistory,
      tasteProfile: remote.tasteProfile || localTaste,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: resolvedCredits,
      aiSearchRemaining: resolvedAiSearches,
      promptRequestsRemaining: resolvedRequests,
      unlockedPromptIds: mergedUnlocked,
      planStartedAt: resolvedPlanStartedAt,
      planExpiresAt: resolvedPlanExpiresAt,
      queuedPlan: activeQueuedPlan,
    };
  },

  /**
   * Server-side session validator that forces re-fetch of user profile,
   * subscription status, and credit balance from Supabase directly.
   */
  validateSession: async (userId?: string, email?: string): Promise<UserSyncData | null> => {
    if (!userId && !email) return null;
    try {
      const res = await fetch('/api/user/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.valid && json.syncData) {
          return json.syncData;
        }
      }
    } catch (e) {
      console.warn('UserSyncService: Session validation notice:', e);
    }
    return null;
  },
};
