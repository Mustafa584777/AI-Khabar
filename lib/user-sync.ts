import { UserAccount, AIHistoryItem, UserTasteProfile } from '@/types/prompt';
import { StorageService } from './storage';
import { PersonalizationEngine, INITIAL_TASTE_PROFILE } from './personalization';

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
   * Pull user data from Supabase cloud storage
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
   * Push user state changes to Supabase cloud storage
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
   * Specifically sync bookmarks to Supabase
   */
  syncBookmarks: async (
    userId?: string,
    email?: string,
    bookmarkedIds?: string[]
  ): Promise<boolean> => {
    return UserSyncService.pushUserData(userId, email, { bookmarkedIds });
  },

  /**
   * Specifically sync taste profile to Supabase
   */
  syncTasteProfile: async (
    userId?: string,
    email?: string,
    tasteProfile?: UserTasteProfile
  ): Promise<boolean> => {
    return UserSyncService.pushUserData(userId, email, { tasteProfile });
  },

  /**
   * Called whenever a user logs in (or on initial load with authenticated user).
   * Reconciles remote data with local cache. In incognito, remote data repopulates
   * bookmarks, likes, and customized taste profile!
   */
  reconcileOnLogin: async (user: UserAccount): Promise<{
    bookmarkedIds: string[];
    likedIds: string[];
    points: number;
    aiHistory: AIHistoryItem[];
    tasteProfile: UserTasteProfile;
  }> => {
    const localBookmarks = StorageService.getBookmarkedIds();
    const localLikes = StorageService.getLikedIds();
    const localHistory = StorageService.getAiHistory();
    const localTasteProfile = PersonalizationEngine.getProfile();
    const currentPoints = user.points || 10;

    const remote = await UserSyncService.pullUserData(user.id, user.email);

    if (!remote) {
      // First time login or no remote sync record yet: push current local state to cloud
      void UserSyncService.pushUserData(user.id, user.email, {
        bookmarkedIds: localBookmarks,
        likedIds: localLikes,
        aiHistory: localHistory,
        tasteProfile: localTasteProfile,
        points: currentPoints,
        name: user.name,
        avatar: user.avatar,
      });

      return {
        bookmarkedIds: localBookmarks,
        likedIds: localLikes,
        points: currentPoints,
        aiHistory: localHistory,
        tasteProfile: localTasteProfile,
      };
    }

    // Merge remote and local bookmarks (union of sets so neither is lost)
    const mergedBookmarks = Array.from(
      new Set([...localBookmarks, ...(remote.bookmarkedIds || [])])
    );
    const mergedLikes = Array.from(
      new Set([...localLikes, ...(remote.likedIds || [])])
    );

    // Merge AI history unique by id
    const historyMap = new Map<string, AIHistoryItem>();
    [...(remote.aiHistory || []), ...localHistory].forEach((item) => {
      if (item && item.id) {
        historyMap.set(item.id, item);
      }
    });
    const mergedHistory = Array.from(historyMap.values()).slice(0, 100);

    const mergedPoints = Math.max(currentPoints, remote.points || 0);

    // Reconcile taste profile
    let mergedTasteProfile: UserTasteProfile;
    if (remote.tasteProfile) {
      const rem = remote.tasteProfile;
      const loc = localTasteProfile;

      // Determine genderVibe: prefer customized vibe over default 'all'
      let genderVibe = loc.genderVibe;
      if (genderVibe === 'all' && rem.genderVibe && rem.genderVibe !== 'all') {
        genderVibe = rem.genderVibe;
      } else if (rem.genderVibe && rem.lastUpdated && loc.lastUpdated) {
        if (new Date(rem.lastUpdated).getTime() >= new Date(loc.lastUpdated).getTime()) {
          genderVibe = rem.genderVibe;
        }
      }

      // Merge favorite styles and tools
      const favoriteStyles = Array.from(
        new Set([...(rem.favoriteStyles || []), ...(loc.favoriteStyles || [])])
      );
      const favoriteTools = Array.from(
        new Set([...(rem.favoriteTools || []), ...(loc.favoriteTools || [])])
      );

      // Merge affinity maps taking maximum score
      const mergeAffinityMap = (
        r: Record<string, number> = {},
        l: Record<string, number> = {}
      ) => {
        const out: Record<string, number> = { ...r };
        for (const [k, v] of Object.entries(l)) {
          out[k] = Math.max(out[k] || 0, v);
        }
        return out;
      };

      const categoryAffinities = mergeAffinityMap(rem.categoryAffinities, loc.categoryAffinities);
      const tagAffinities = mergeAffinityMap(rem.tagAffinities, loc.tagAffinities);
      const toolAffinities = mergeAffinityMap(rem.toolAffinities, loc.toolAffinities);
      const clickedPostIds = mergeAffinityMap(rem.clickedPostIds, loc.clickedPostIds);
      const copiedPostIds = Array.from(
        new Set([...(rem.copiedPostIds || []), ...(loc.copiedPostIds || [])])
      ).slice(0, 50);

      mergedTasteProfile = {
        genderVibe,
        favoriteStyles: favoriteStyles.length > 0 ? favoriteStyles : INITIAL_TASTE_PROFILE.favoriteStyles,
        favoriteTools: favoriteTools.length > 0 ? favoriteTools : INITIAL_TASTE_PROFILE.favoriteTools,
        categoryAffinities,
        tagAffinities,
        toolAffinities,
        clickedPostIds,
        copiedPostIds,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      mergedTasteProfile = localTasteProfile;
    }

    // Update local cache so next instant renders have full synced data
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('promptcms_user_bookmarks', JSON.stringify(mergedBookmarks));
        localStorage.setItem('promptcms_user_likes', JSON.stringify(mergedLikes));
        localStorage.setItem('promptcms_ai_history', JSON.stringify(mergedHistory));
        PersonalizationEngine.saveProfile(mergedTasteProfile);
      } catch (e) {
        console.error('Error saving merged cache:', e);
      }
    }

    // Push merged state back to Supabase cloud to keep all devices in perfect sync
    void UserSyncService.pushUserData(user.id, user.email, {
      bookmarkedIds: mergedBookmarks,
      likedIds: mergedLikes,
      aiHistory: mergedHistory,
      points: mergedPoints,
      tasteProfile: mergedTasteProfile,
      name: user.name,
      avatar: user.avatar,
    });

    return {
      bookmarkedIds: mergedBookmarks,
      likedIds: mergedLikes,
      points: mergedPoints,
      aiHistory: mergedHistory,
      tasteProfile: mergedTasteProfile,
    };
  },
};
