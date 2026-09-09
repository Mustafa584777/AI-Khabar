import { UserAccount, AIHistoryItem } from '@/types/prompt';
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
  updatedAt?: string;
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
   * Ensures all bookmarks, likes, history, points, and taste profile come from database.
   */
  reconcileOnLogin: async (user: UserAccount): Promise<{
    bookmarkedIds: string[];
    likedIds: string[];
    points: number;
    aiHistory: AIHistoryItem[];
    tasteProfile: UserTasteProfile;
  }> => {
    const currentPoints = user.points || 10;
    const remote = await UserSyncService.pullUserData(user.id, user.email);

    if (!remote) {
      // First time login or no remote record yet: initialize database record with defaults
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
        updatedAt: new Date().toISOString(),
      };

      void UserSyncService.pushUserData(user.id, user.email, initialData);

      return {
        bookmarkedIds: [],
        likedIds: [],
        points: currentPoints,
        aiHistory: [],
        tasteProfile: INITIAL_TASTE_PROFILE,
      };
    }

    return {
      bookmarkedIds: Array.isArray(remote.bookmarkedIds) ? remote.bookmarkedIds : [],
      likedIds: Array.isArray(remote.likedIds) ? remote.likedIds : [],
      points: remote.points !== undefined ? Number(remote.points) : currentPoints,
      aiHistory: Array.isArray(remote.aiHistory) ? remote.aiHistory : [],
      tasteProfile: remote.tasteProfile || INITIAL_TASTE_PROFILE,
    };
  },
};
