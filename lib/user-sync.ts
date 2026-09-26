import { UserAccount, AIHistoryItem, PlanTier, PromptRequestItem } from '@/types/prompt';
import { INITIAL_TASTE_PROFILE, UserTasteProfile } from './personalization';
import { PLAN_CONFIGS } from './plans';

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
  planStartedAt?: string;
  planExpiresAt?: string;
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
    aiSearchRemaining: number;
    promptRequestsRemaining: number;
    unlockedPromptIds: string[];
    planStartedAt?: string;
    planExpiresAt?: string;
  }> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const remote = await UserSyncService.pullUserData(user.id, user.email);

    if (!remote) {
      // First time login for this specific user: grant 5 credits & 5 AI searches on signup
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
        toolCredits: 5, // 5 signup credits one-time
        aiSearchRemaining: 5, // 5 AI search quota one-time
        promptRequestsRemaining: 0,
        unlockedPromptIds: [],
        joinedDate: new Date().toISOString(),
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
        toolCredits: 5,
        aiSearchRemaining: 5,
        promptRequestsRemaining: 0,
        unlockedPromptIds: [],
      };
    }

    // Remote account exists for this user: use strictly their remote verified plan & credits
    let resolvedTier: PlanTier = (remote.planTier && ['starter', 'pro', 'vip', 'ultra', 'free'].includes(remote.planTier))
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

    const planCfg = PLAN_CONFIGS[resolvedTier] || PLAN_CONFIGS.free;

    let currentCredits = Math.max(Number(remote.toolCredits ?? planCfg.credits), planCfg.credits);
    let currentRequests = Math.max(Number(remote.promptRequestsRemaining ?? planCfg.promptRequests), planCfg.promptRequests);
    let currentAiSearchRemaining = Math.max(Number(remote.aiSearchRemaining ?? planCfg.aiSearchQuota), planCfg.aiSearchQuota);

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
      aiSearchRemaining: currentAiSearchRemaining,
      promptRequestsRemaining: currentRequests,
      unlockedPromptIds: Array.isArray(remote.unlockedPromptIds) ? remote.unlockedPromptIds : [],
      planStartedAt: remote.planStartedAt,
      planExpiresAt: remote.planExpiresAt,
      joinedDate: remote.joinedDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      bookmarkedIds: mergedData.bookmarkedIds || [],
      likedIds: mergedData.likedIds || [],
      points: mergedData.points !== undefined ? mergedData.points : 10,
      aiHistory: mergedData.aiHistory || [],
      tasteProfile: mergedData.tasteProfile || INITIAL_TASTE_PROFILE,
      planTier: resolvedTier,
      isProUser: resolvedIsPro,
      toolCredits: currentCredits,
      aiSearchRemaining: currentAiSearchRemaining,
      promptRequestsRemaining: currentRequests,
      unlockedPromptIds: mergedData.unlockedPromptIds || [],
      planStartedAt: remote.planStartedAt,
      planExpiresAt: remote.planExpiresAt,
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
