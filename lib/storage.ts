import { Category, PromptPost, SiteSettings, UserAccount, AIHistoryItem } from '@/types/prompt';
import { INITIAL_CATEGORIES, INITIAL_SETTINGS, INITIAL_POSTS } from './initial-data';

const STORAGE_KEY_BOOKMARKS = 'promptcms_user_bookmarks';
const STORAGE_KEY_LIKES = 'promptcms_user_likes';
const STORAGE_KEY_USER_ACCOUNT = 'promptcms_user_account';
const STORAGE_KEY_AI_HISTORY = 'promptcms_ai_history';
const STORAGE_KEY_CACHED_POSTS = 'promptcms_cached_posts';
const STORAGE_KEY_CACHED_CATEGORIES = 'promptcms_cached_categories';
const STORAGE_KEY_CACHED_TAGS = 'promptcms_cached_tags';
const STORAGE_KEY_CACHED_SETTINGS = 'promptcms_cached_settings';

export const StorageService = {
  // Instant Cache for Fast 0ms Page Load
  getCachedPosts: (): PromptPost[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CACHED_POSTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error reading cached posts:', e);
      }
    }
    return INITIAL_POSTS || [];
  },

  saveCachedPosts: (posts: PromptPost[]): void => {
    if (typeof window !== 'undefined' && Array.isArray(posts)) {
      try {
        localStorage.setItem(STORAGE_KEY_CACHED_POSTS, JSON.stringify(posts));
      } catch (e) {
        console.warn('Direct localStorage quota warning, attempting sanitized storage:', e);
        try {
          // If storage full due to base64 images, save with trimmed image data for cache
          const sanitized = posts.map((p) => {
            if (typeof p.imageUrl === 'string' && p.imageUrl.startsWith('data:image/') && p.imageUrl.length > 5000) {
              return {
                ...p,
                imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
              };
            }
            return p;
          });
          localStorage.setItem(STORAGE_KEY_CACHED_POSTS, JSON.stringify(sanitized));
        } catch (innerErr) {
          console.error('Failed to save cached posts to localStorage:', innerErr);
        }
      }
    }
  },

  getCachedCategories: (): Category[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CACHED_CATEGORIES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Error reading cached categories:', e);
      }
    }
    return INITIAL_CATEGORIES;
  },

  saveCachedCategories: (categories: Category[]): void => {
    if (typeof window !== 'undefined' && Array.isArray(categories)) {
      try {
        localStorage.setItem(STORAGE_KEY_CACHED_CATEGORIES, JSON.stringify(categories));
      } catch (e) {
        console.error('Error saving cached categories:', e);
      }
    }
  },

  getCachedTags: (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CACHED_TAGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Error reading cached tags:', e);
      }
    }
    return [];
  },

  saveCachedTags: (tags: string[]): void => {
    if (typeof window !== 'undefined' && Array.isArray(tags)) {
      try {
        localStorage.setItem(STORAGE_KEY_CACHED_TAGS, JSON.stringify(tags));
      } catch (e) {
        console.error('Error saving cached tags:', e);
      }
    }
  },

  getCachedSettings: (): SiteSettings => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CACHED_SETTINGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return { ...INITIAL_SETTINGS, ...parsed };
        }
      } catch (e) {
        console.error('Error reading cached settings:', e);
      }
    }
    return INITIAL_SETTINGS;
  },

  saveCachedSettings: (settings: SiteSettings): void => {
    if (typeof window !== 'undefined' && settings) {
      try {
        localStorage.setItem(STORAGE_KEY_CACHED_SETTINGS, JSON.stringify(settings));
      } catch (e) {
        console.error('Error saving cached settings:', e);
      }
    }
  },
  // Bookmarks (Client local user preference)
  getBookmarkedIds: (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  },

  toggleBookmark: (id: string): boolean => {
    const current = StorageService.getBookmarkedIds();
    let updated: string[];
    let isBookmarked: boolean;

    if (current.includes(id)) {
      updated = current.filter((item) => item !== id);
      isBookmarked = false;
    } else {
      updated = [...current, id];
      isBookmarked = true;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(updated));
    }
    return isBookmarked;
  },

  // Likes (Client local user preference)
  getLikedIds: (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LIKES);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  },

  toggleLikeLocal: (id: string): boolean => {
    const current = StorageService.getLikedIds();
    let updated: string[];
    let isLiked: boolean;

    if (current.includes(id)) {
      updated = current.filter((item) => item !== id);
      isLiked = false;
    } else {
      updated = [...current, id];
      isLiked = true;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(updated));
    }
    return isLiked;
  },

  // Admin Auth Helpers
  authenticateAdmin: (email: string, pass: string): boolean => {
    const validEmail = 'admin@trendinggeminiprompts.com';
    const validPass = 'admin123';

    if (
      (email.toLowerCase() === validEmail.toLowerCase() || email.toLowerCase() === 'admin') &&
      pass === validPass
    ) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('promptcms_auth', 'true');
        localStorage.setItem(
          'promptcms_user',
          JSON.stringify({
            id: 'admin-1',
            name: 'Administrator',
            email: validEmail,
            role: 'Administrator',
            avatar:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
          })
        );
      }
      return true;
    }
    return false;
  },

  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('promptcms_user');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  },

  logoutAdmin: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('promptcms_auth');
      localStorage.removeItem('promptcms_user');
    }
  },

  // Regular End-User Account (for saving History, Syncing Pins & Taste)
  getUserAccount: (): UserAccount | null => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_USER_ACCOUNT);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error reading user account:', e);
      }
    }
    return null;
  },

  saveUserAccount: (account: UserAccount): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER_ACCOUNT, JSON.stringify(account));
    }
  },

  logoutUserAccount: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER_ACCOUNT);
    }
  },

  // AI Generation & Extraction History
  getAiHistory: (userId?: string): AIHistoryItem[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AI_HISTORY);
        if (saved) {
          const items: AIHistoryItem[] = JSON.parse(saved);
          if (userId) {
            return items.filter((it) => !it.userId || it.userId === userId);
          }
          return items;
        }
      } catch (e) {
        console.error('Error reading AI history:', e);
      }
    }
    return [];
  },

  saveAiHistoryItem: (item: AIHistoryItem): AIHistoryItem[] => {
    const current = StorageService.getAiHistory();
    // Prepend new item and keep up to 100 entries
    const updated = [item, ...current.filter((it) => it.id !== item.id)].slice(0, 100);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AI_HISTORY, JSON.stringify(updated));
    }
    return updated;
  },

  deleteAiHistoryItem: (id: string): AIHistoryItem[] => {
    const current = StorageService.getAiHistory();
    const updated = current.filter((it) => it.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AI_HISTORY, JSON.stringify(updated));
    }
    return updated;
  },

  clearAiHistory: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AI_HISTORY);
    }
  },

  // Persistent Reference Photo
  getPersistentRefImage: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('promptcms_persistent_ref_image');
    }
    return null;
  },

  savePersistentRefImage: (url: string | null): void => {
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('promptcms_persistent_ref_image', url);
      } else {
        localStorage.removeItem('promptcms_persistent_ref_image');
      }
    }
  },

  // Prompt Requests
  getPromptRequests: (): any[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('promptcms_prompt_requests');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'req_1',
        userId: 'u_mock1',
        userName: 'Prompt Master',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        requestText: 'Cyberpunk Tokyo street vendor at night with hyper-detailed ramen steam and neon reflections',
        category: 'Cyberpunk',
        status: 'completed',
        createdAt: Date.now() - 3600000 * 4,
        likesCount: 14,
      },
      {
        id: 'req_2',
        userId: 'u_mock2',
        userName: 'Elena Art',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        requestText: 'Ethereal fantasy floating island with crystal waterfall and golden hour volumetric fog',
        category: 'Fantasy & Magic',
        status: 'in_progress',
        createdAt: Date.now() - 3600000 * 12,
        likesCount: 8,
      },
    ];
  },

  savePromptRequest: (request: any): any[] => {
    const current = StorageService.getPromptRequests();
    const updated = [request, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem('promptcms_prompt_requests', JSON.stringify(updated));
    }
    return updated;
  },

  savePromptRequests: (requests: any[]): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('promptcms_prompt_requests', JSON.stringify(requests));
    }
  },

  getLeaderboardUsers: (): any[] => {
    return [
      { id: 'lb_1', name: 'Sophia Vision', username: '@sophia_ai', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', points: 42, requestsMade: 4 },
      { id: 'lb_2', name: 'Alex Prompt', username: '@alex_prompt', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', points: 35, requestsMade: 3 },
      { id: 'lb_3', name: 'Maya Creator', username: '@maya_art', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80', points: 28, requestsMade: 2 },
      { id: 'lb_4', name: 'Liam Render', username: '@liam_3d', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', points: 19, requestsMade: 1 },
    ];
  },
};
