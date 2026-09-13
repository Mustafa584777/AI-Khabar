import { UserAccount, AIHistoryItem, PlanTier } from '@/types/prompt';
import { INITIAL_TASTE_PROFILE, UserTasteProfile } from './personalization';

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
  promptRequestsRemaining?: number;
  unlockedPromptIds?: string[];
  updatedAt?: string;
}

const TIER_WEIGHT: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  vip: 3,
};

function resolveHighestTier(t1?: PlanTier, t2?: PlanTier): PlanTier {
  const w1 = t1 && TIER_WEIGHT[t1] !== undefined ? TIER_WEIGHT[t1] : 0;
  const w2 = t2 && TIER_WEIGHT[t2] !== undefined ? TIER_WEIGHT[t2] : 0;
  if (w1 >= w2 && w1 > 0) return t1!;
  if (w2 > w1) return t2!;
  return 'free';
}

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
   * Push user state changes directly to Supabase cloud storage (database)
   */
  pushUserData: async (
    userId?: string,
    email?: string,
    data?: Partial<UserSyncData>
  ): Promise<boolean> => {
    if ((!userId && !email) || !data) return false;
    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          userId,
          email,
          data,
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
   * Called whenever a user logs in. Pulls remote user data from database.
   * Ensures all bookmarks, likes, history, points, plans, credits, and unlocked content come strictly from the authenticated user's remote cloud record.
   * Never leaks or inherits data from prior sessions or other accounts.
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
    promptRequestsRemaining: number;
    unlockedPromptIds: string[];
  }> => {
    const currentPoints = user.points || 10;
    let remote = await UserSyncService.pullUserData(user.id, user.email);

    // Strict account isolation: if remote record belongs to another email, discard it immediately
    if (
      remote &&
      remote.email &&
      user.email &&
      remote.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) {
      console.warn('Cross-account data detected in pullUserData, rejecting foreign record');
      remote = null;
    }

    if (!remote) {
      // First time login or no remote record yet for this specific user:
      // Initialize a clean, free-tier account with standard 2 starter credits
      const initialTier: PlanTier = 'free';
      const initialIsPro = false;
      const initialCredits = 2;
      const today = new Date().toISOString().split('T')[0];

      const initialData: UserSyncData = {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        points: currentPoints,
        bookmarkedIds: [],
        likedIds: [],
        aiHistory: [],
        tasteProfile: INITIAL_TASTE_PROFILE,
        planTier: initialTier,
        isProUser: initialIsPro,
        toolCredits: initialCredits,
        promptRequestsRemaining: 0,
        unlockedPromptIds: [],
        updatedAt: new Date().toISOString(),
      };

      void UserSyncService.pushUserData(user.id, user.email, initialData);

      return {
        bookmarkedIds: [],
        likedIds: [],
        points: currentPoints,
        aiHistory: [],
        tasteProfile: INITIAL_TASTE_PROFILE,
        planTier: initialTier,
        isProUser: initialIsPro,
        toolCredits: initialCredits,
        promptRequestsRemaining: 0,
        unlockedPromptIds: [],
      };
    }

    // Remote account exists: strictly respect cloud record for this user
    const resolvedTier: PlanTier = (
      ['starter', 'pro', 'vip'].includes(remote.planTier as string) ? remote.planTier : 'free'
    ) as PlanTier;
    const resolvedIsPro = Boolean(remote.isProUser && resolvedTier !== 'free');

    // Daily 2 credit refresh check for free tier users
    let resolvedCredits = remote.toolCredits !== undefined ? Number(remote.toolCredits) : 2;
    const today = new Date().toISOString().split('T')[0];
    const remoteLastCreditDate = (remote as any).lastCreditDate;

    if (resolvedTier === 'free' && remoteLastCreditDate !== today) {
      resolvedCredits = Math.max(resolvedCredits, 2);
      void UserSyncService.pushUserData(user.id, user.email, {
        toolCredits: resolvedCredits,
        // @ts-ignore
        lastCreditDate: today,
      });
    }

    const resolvedUnlocks = Array.isArray(remote.unlockedPromptIds) ? remote.unlockedPromptIds : [];
    const resolvedRequestsRemaining = remote.promptRequestsRemaining !== undefined ? Number(remote.promptRequestsRemaining) : 0;

    return {
      bookmarkedIds: Array.isArray(remote.bookmarkedIds) ? remote.bookmarkedIds : [],
      likedIds: Array.isArray(remote.likedIds) ? remote.likedIds : [],
      points: remote.points !== undefined ? Number(remote.points) : currentPoints,
      aiHistory: Array.isArray(remote.aiHistory) ? remote.aiHistory : [],
      tasteProfile: remote.tasteProfile || INITIAL_TASTE_PROFILE,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: resolvedCredits,
      promptRequestsRemaining: resolvedRequestsRemaining,
      unlockedPromptIds: resolvedUnlocks,
    };
  },
};
