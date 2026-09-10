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
   * Ensures all bookmarks, likes, history, points, plans, credits, and unlocked content come from database and merge safely without data loss.
   */
  reconcileOnLogin: async (
    user: UserAccount,
    localState?: {
      planTier?: PlanTier;
      isProUser?: boolean;
      toolCredits?: number;
      promptRequestsRemaining?: number;
      unlockedPromptIds?: string[];
    }
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
    const remote = await UserSyncService.pullUserData(user.id, user.email);

    // Resolve Highest Tier to prevent accidental downgrades across app updates
    const resolvedTier = resolveHighestTier(localState?.planTier, remote?.planTier);
    const resolvedIsPro = resolvedTier !== 'free' || Boolean(localState?.isProUser || remote?.isProUser);

    // Resolve Credits: highest balance is maintained
    const resolvedCredits = Math.max(
      localState?.toolCredits || 0,
      remote?.toolCredits !== undefined ? Number(remote.toolCredits) : 0,
      2 // minimum 2 daily base
    );

    // Resolve Unlocked Prompts: non-destructive union
    const resolvedUnlocks = Array.from(
      new Set([...(localState?.unlockedPromptIds || []), ...(remote?.unlockedPromptIds || [])])
    );

    const resolvedRequestsRemaining = Math.max(
      localState?.promptRequestsRemaining || 0,
      remote?.promptRequestsRemaining || 0
    );

    if (!remote) {
      // First time login or no remote record yet: initialize database record with defaults and local state
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
        planTier: resolvedTier,
        isProUser: resolvedIsPro,
        toolCredits: resolvedCredits,
        promptRequestsRemaining: resolvedRequestsRemaining,
        unlockedPromptIds: resolvedUnlocks,
        updatedAt: new Date().toISOString(),
      };

      void UserSyncService.pushUserData(user.id, user.email, initialData);

      return {
        bookmarkedIds: [],
        likedIds: [],
        points: currentPoints,
        aiHistory: [],
        tasteProfile: INITIAL_TASTE_PROFILE,
        planTier: resolvedTier,
        isProUser: resolvedIsPro,
        toolCredits: resolvedCredits,
        promptRequestsRemaining: resolvedRequestsRemaining,
        unlockedPromptIds: resolvedUnlocks,
      };
    }

    // Remote exists - merge non-destructively and push back if local had additional items
    const mergedData: UserSyncData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      points: remote.points !== undefined ? Number(remote.points) : currentPoints,
      bookmarkedIds: Array.isArray(remote.bookmarkedIds) ? remote.bookmarkedIds : [],
      likedIds: Array.isArray(remote.likedIds) ? remote.likedIds : [],
      aiHistory: Array.isArray(remote.aiHistory) ? remote.aiHistory : [],
      tasteProfile: remote.tasteProfile || INITIAL_TASTE_PROFILE,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: resolvedCredits,
      promptRequestsRemaining: resolvedRequestsRemaining,
      unlockedPromptIds: resolvedUnlocks,
      updatedAt: new Date().toISOString(),
    };

    void UserSyncService.pushUserData(user.id, user.email, mergedData);

    return {
      bookmarkedIds: mergedData.bookmarkedIds || [],
      likedIds: mergedData.likedIds || [],
      points: mergedData.points !== undefined ? mergedData.points : currentPoints,
      aiHistory: mergedData.aiHistory || [],
      tasteProfile: mergedData.tasteProfile || INITIAL_TASTE_PROFILE,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: resolvedCredits,
      promptRequestsRemaining: resolvedRequestsRemaining,
      unlockedPromptIds: resolvedUnlocks,
    };
  },
};
