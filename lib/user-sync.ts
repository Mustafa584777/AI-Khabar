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
  lastDailyCreditDate?: string;
  promptRequestsRemaining?: number;
  unlockedPromptIds?: string[];
  planStartedAt?: string;
  planExpiresAt?: string;
  updatedAt?: string;
}

const TIER_WEIGHT: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  vip: 3,
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
   * STRICT GUARANTEE: Never inherits or leaks credits, plans, or bookmarks from previous sessions or guests.
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
    planStartedAt?: string;
    planExpiresAt?: string;
  }> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const remote = await UserSyncService.pullUserData(user.id, user.email);

    if (!remote) {
      // First time login for this specific user: grant 2 daily credits for today on clean free tier
      const initialData: UserSyncData = {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        points: user.points || 10,
        bookmarkedIds: [],
        likedIds: [],
        aiHistory: [],
        tasteProfile: INITIAL_TASTE_PROFILE,
        planTier: 'free',
        isProUser: false,
        toolCredits: 2, // 2 daily credits start after login
        lastDailyCreditDate: todayStr,
        promptRequestsRemaining: 0,
        unlockedPromptIds: [],
        updatedAt: new Date().toISOString(),
      };

      void UserSyncService.pushUserData(user.id, user.email, initialData);

      return {
        bookmarkedIds: [],
        likedIds: [],
        points: user.points || 10,
        aiHistory: [],
        tasteProfile: INITIAL_TASTE_PROFILE,
        planTier: 'free',
        isProUser: false,
        toolCredits: 2,
        promptRequestsRemaining: 0,
        unlockedPromptIds: [],
      };
    }

    // Remote account exists for this user: use strictly their remote verified plan & credits
    let resolvedTier: PlanTier = (remote.planTier && ['starter', 'pro', 'vip', 'free'].includes(remote.planTier))
      ? remote.planTier
      : (remote.isProUser ? 'pro' : 'free');
    
    let resolvedIsPro: boolean = resolvedTier !== 'free' || Boolean(remote.isProUser);

    // Validate plan expiration if an expiration date is present
    if (resolvedTier !== 'free' && remote.planExpiresAt) {
      const expTime = new Date(remote.planExpiresAt).getTime();
      if (!isNaN(expTime) && expTime < Date.now()) {
        resolvedTier = 'free';
        resolvedIsPro = false;
      }
    }

    let currentCredits = Number(remote.toolCredits ?? 0);
    let lastCreditDate = remote.lastDailyCreditDate;

    // Daily 2 credits refresh logic: if free user logs in on a new day, refresh daily credits to at least 2
    if (!resolvedIsPro && resolvedTier === 'free') {
      if (lastCreditDate !== todayStr) {
        currentCredits = Math.max(currentCredits, 2);
        lastCreditDate = todayStr;
      }
    }

    const mergedData: UserSyncData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      points: remote.points !== undefined ? Number(remote.points) : (user.points || 10),
      bookmarkedIds: Array.isArray(remote.bookmarkedIds) ? remote.bookmarkedIds : [],
      likedIds: Array.isArray(remote.likedIds) ? remote.likedIds : [],
      aiHistory: Array.isArray(remote.aiHistory) ? remote.aiHistory : [],
      tasteProfile: remote.tasteProfile || INITIAL_TASTE_PROFILE,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: currentCredits,
      lastDailyCreditDate: lastCreditDate,
      promptRequestsRemaining: Number(remote.promptRequestsRemaining || 0),
      unlockedPromptIds: Array.isArray(remote.unlockedPromptIds) ? remote.unlockedPromptIds : [],
      planStartedAt: remote.planStartedAt,
      planExpiresAt: remote.planExpiresAt,
      updatedAt: new Date().toISOString(),
    };

    // Keep database in sync with any daily credit refresh
    if (lastCreditDate === todayStr && remote.lastDailyCreditDate !== todayStr) {
      void UserSyncService.pushUserData(user.id, user.email, {
        toolCredits: currentCredits,
        lastDailyCreditDate: lastCreditDate,
      });
    }

    return {
      bookmarkedIds: mergedData.bookmarkedIds || [],
      likedIds: mergedData.likedIds || [],
      points: mergedData.points !== undefined ? mergedData.points : 10,
      aiHistory: mergedData.aiHistory || [],
      tasteProfile: mergedData.tasteProfile || INITIAL_TASTE_PROFILE,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: currentCredits,
      promptRequestsRemaining: mergedData.promptRequestsRemaining || 0,
      unlockedPromptIds: mergedData.unlockedPromptIds || [],
      planStartedAt: remote.planStartedAt,
      planExpiresAt: remote.planExpiresAt,
    };
  },
};
