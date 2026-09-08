'use client';
/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { PromptPost, Category, SiteSettings, AdminUser, UserAccount, AIHistoryItem, AiSearchResult, PlanTier } from '@/types/prompt';
import { StorageService } from '@/lib/storage';
import { supabase, supabaseUserToUserAccount } from '@/lib/supabase';
import { INITIAL_POSTS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from '@/lib/initial-data';
import {
  UserTasteProfile,
  PersonalizationEngine,
  INITIAL_TASTE_PROFILE,
} from '@/lib/personalization';

interface AppContextType {
  // Navigation & Views
  currentView: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you';
  setCurrentView: (view: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you') => void;
  adminSubView: 'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history';
  setAdminSubView: (subView: 'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history') => void;
  editingPostId: string | null;
  setEditingPostId: (id: string | null) => void;
  selectedPost: PromptPost | null;
  setSelectedPost: (post: PromptPost | null) => void;

  // Personalization & Taste Profile (Pinterest-Style AI Personalization)
  tasteProfile: UserTasteProfile;
  setTasteProfile: (profile: UserTasteProfile) => void;
  updateTasteProfile: (updates: Partial<UserTasteProfile>) => void;
  isTasteModalOpen: boolean;
  setIsTasteModalOpen: (open: boolean) => void;
  recordPromptClick: (post: PromptPost) => void;

  // Admin Auth (Used ONLY by /cms-login)
  isAuthenticated: boolean;
  currentUser: AdminUser | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;

  // End-User Account & Authentication
  userAccount: UserAccount | null;
  setUserAccount: (account: UserAccount | null) => void;
  isUserAuthModalOpen: boolean;
  setIsUserAuthModalOpen: (open: boolean) => void;
  authModalMessage: string | null;
  setAuthModalMessage: (msg: string | null) => void;
  openAuthModal: (message?: string) => void;
  loginUser: (email: string, pass: string, username?: string, avatar?: string) => boolean;
  signupUser: (name: string, username: string, email: string, pass: string, avatar?: string) => UserAccount;
  logoutUser: () => void;
  awardPoints: (amount: number, type: 'like' | 'save' | 'generation' | 'share' | 'referral') => void;

  // Persistent Reference Photo & Prompt Requests
  persistentRefImage: string | null;
  setPersistentRefImage: (url: string | null) => void;
  promptRequests: any[];
  addPromptRequest: (requestText: string, category?: string) => boolean;

  // AI Studio History (Image to Prompt & Prompt to Image)
  aiHistory: AIHistoryItem[];
  saveAiHistoryItem: (item: AIHistoryItem) => void;
  deleteAiHistoryItem: (id: string) => void;
  clearAiHistory: () => void;

  // Data
  posts: PromptPost[];
  setPosts: React.Dispatch<React.SetStateAction<PromptPost[]>>;
  isLoadingPosts: boolean;
  categories: Category[];
  tags: string[];
  settings: SiteSettings;
  bookmarkedIds: string[];
  likedIds: string[];
  isBookmarksDrawerOpen: boolean;
  setIsBookmarksDrawerOpen: (open: boolean) => void;

  // Filters for public site
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  popularSearchQueries: string[];
  recordSearchQuery: (query: string) => void;
  aiSearchResults: AiSearchResult | null;
  isAiSearching: boolean;
  performAiSearch: (query: string) => Promise<AiSearchResult | null>;
  clearAiSearch: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  selectedSort: 'trending' | 'most-popular' | 'most-liked' | 'most-copied' | 'newest';
  setSelectedSort: (sort: 'trending' | 'most-popular' | 'most-liked' | 'most-copied' | 'newest') => void;

  // Actions
  refreshData: () => void;
  savePost: (post: PromptPost) => Promise<PromptPost>;
  deletePost: (id: string) => Promise<boolean>;
  togglePublishStatus: (id: string) => void;
  copyPromptToClipboard: (text: string, postId?: string) => void;
  toggleLike: (id: string) => void;
  toggleBookmark: (id: string) => void;
  restorePromptCards: (
    incomingPosts: PromptPost[],
    mode?: 'merge' | 'replace',
    incomingCategories?: Category[],
    incomingTags?: string[]
  ) => Promise<{ success: boolean; count: number }>;
  saveCategory: (cat: Category) => Promise<Category>;
  deleteCategory: (id: string) => Promise<boolean>;
  addTag: (tag: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  saveSettings: (settings: Partial<SiteSettings>) => Promise<SiteSettings>;
  resetAllData: () => void;
  showToast: (msg: string) => void;
  toastMessage: string | null;

  // Razorpay Pro Membership & Checkout
  isProCheckoutModalOpen: boolean;
  setIsProCheckoutModalOpen: (open: boolean) => void;
  isProUser: boolean;
  setIsProUser: (isPro: boolean) => void;
  planTier: PlanTier;
  setPlanTier: (tier: PlanTier) => void;
  toolCredits: number;
  deductToolCredit: () => boolean;
  useToolCredit: () => boolean;
  addToolCredits: (amount: number) => void;
  promptRequestsRemaining: number;
  upgradePlan: (tier: 'starter' | 'pro' | 'vip') => void;

  isUnlockPremiumModalOpen: boolean;
  setIsUnlockPremiumModalOpen: (open: boolean) => void;
  lockedPromptContext: PromptPost | null;
  setLockedPromptContext: (post: PromptPost | null) => void;
  applyPlan: (planTier: 'starter' | 'pro' | 'vip') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Navigation
  const [currentView, setCurrentView] = useState<'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you'>('public');
  const [adminSubView, setAdminSubView] = useState<
    'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history'
  >('dashboard');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PromptPost | null>(null);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // End-User Account State (For saving history, sync pins & taste profile)
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [isUserAuthModalOpen, setIsUserAuthModalOpen] = useState<boolean>(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | null>(null);

  // Razorpay Pro Membership & Plan Tier State
  const [isProCheckoutModalOpen, setIsProCheckoutModalOpen] = useState<boolean>(false);
  const [isProUser, setIsProUserState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auraprompt_pro_member') === 'true';
    }
    return false;
  });

  const setIsProUser = useCallback((isPro: boolean) => {
    setIsProUserState(isPro);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_pro_member', isPro ? 'true' : 'false');
    }
  }, []);

  const [planTier, setPlanTierState] = useState<PlanTier>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
      if (['starter', 'pro', 'vip', 'free'].includes(saved)) return saved;
      if (localStorage.getItem('auraprompt_pro_member') === 'true') return 'pro';
    }
    return 'free';
  });

  const setPlanTier = useCallback((tier: PlanTier) => {
    setPlanTierState(tier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_plan_tier', tier);
    }
  }, []);

  // Tool Credits (Daily 2 free credits per user, 1 credit per tool result)
  const [toolCredits, setToolCreditsState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_tool_credits');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 2;
  });

  const [promptRequestsRemaining, setPromptRequestsRemainingState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_prompt_requests');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0;
  });

  const [isUnlockPremiumModalOpen, setIsUnlockPremiumModalOpen] = useState<boolean>(false);
  const [lockedPromptContext, setLockedPromptContext] = useState<PromptPost | null>(null);

  // Daily 2 Free Credits Grant Logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('auraprompt_last_credit_date');
    if (lastDate !== today) {
      const currentSaved = parseInt(localStorage.getItem('auraprompt_tool_credits') || '0', 10);
      // Give at least 2 credits every new day, or add 2 bonus if user has a balance
      const newCredits = Math.max(currentSaved, 0) < 2 ? 2 : currentSaved + 2;
      setToolCreditsState(newCredits);
      localStorage.setItem('auraprompt_tool_credits', newCredits.toString());
      localStorage.setItem('auraprompt_last_credit_date', today);
    }
  }, []);

  const deductToolCredit = useCallback((): boolean => {
    let success = false;
    setToolCreditsState((prev) => {
      if (prev > 0) {
        const next = prev - 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_tool_credits', next.toString());
        }
        success = true;
        return next;
      }
      return prev;
    });
    return success;
  }, []);

  const useToolCredit = deductToolCredit;

  const addToolCredits = useCallback((amount: number) => {
    setToolCreditsState((prev) => {
      const next = prev + amount;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', next.toString());
      }
      return next;
    });
  }, []);

  const upgradePlan = useCallback((tier: 'starter' | 'pro' | 'vip') => {
    const creditsMap = { starter: 10, pro: 50, vip: 200 };
    const requestsMap = { starter: 1, pro: 3, vip: 10 };

    setIsProUserState(true);
    setPlanTierState(tier);

    const addedCredits = creditsMap[tier];
    const addedRequests = requestsMap[tier];

    setToolCreditsState((prev) => {
      const next = prev + addedCredits;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', next.toString());
      }
      return next;
    });

    setPromptRequestsRemainingState((prev) => {
      const next = prev + addedRequests;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_prompt_requests', next.toString());
      }
      return next;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_pro_member', 'true');
      localStorage.setItem('auraprompt_plan_tier', tier);
    }
  }, []);

  // AI Studio History State
  const [aiHistory, setAiHistory] = useState<AIHistoryItem[]>([]);

  const openAuthModal = (message?: string) => {
    setAuthModalMessage(message || 'Sign in or create a free account to save your generation history.');
    setIsUserAuthModalOpen(true);
  };

  // Persistent Reference Photo State
  const [persistentRefImage, setPersistentRefImageState] = useState<string | null>(null);

  const setPersistentRefImage = (url: string | null) => {
    StorageService.savePersistentRefImage(url);
    setPersistentRefImageState(url);
    if (url) {
      showToast('Reference photo saved persistently!');
    } else {
      showToast('Reference photo removed');
    }
  };

  // Prompt Requests State
  const [promptRequests, setPromptRequests] = useState<any[]>([]);

  const addPromptRequest = (requestText: string, category?: string): boolean => {
    if (!userAccount || !userAccount.isLoggedIn) {
      openAuthModal('Please sign in to request a prompt.');
      return false;
    }
    const currentPoints = userAccount.points || 0;
    if (currentPoints < 10) {
      showToast(`You need 10 points to request a prompt! Current points: ${currentPoints}/10`);
      return false;
    }

    // Deduct 10 points and increment requestsMade
    const updatedAccount: UserAccount = {
      ...userAccount,
      points: currentPoints - 10,
      requestsMade: (userAccount.requestsMade || 0) + 1,
    };
    setUserAccount(updatedAccount);
    StorageService.saveUserAccount(updatedAccount);

    const newReq = {
      id: 'req_' + Date.now(),
      userId: userAccount.id,
      userName: userAccount.name,
      userAvatar: userAccount.avatar,
      requestText,
      category: category || 'General',
      status: 'pending' as const,
      createdAt: Date.now(),
      likesCount: 0,
    };

    const updatedRequests = StorageService.savePromptRequest(newReq);
    setPromptRequests(updatedRequests);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    showToast('Prompt request submitted successfully! 10 points reset.');
    return true;
  };

  const awardPoints = (amount: number, type: 'like' | 'save' | 'generation' | 'share' | 'referral') => {
    if (!userAccount || !userAccount.isLoggedIn) return;
    const currentPoints = userAccount.points || 0;
    const newPoints = currentPoints + amount;

    const updatedAccount: UserAccount = {
      ...userAccount,
      points: newPoints,
      likesCountForPoints: type === 'like' ? (userAccount.likesCountForPoints || 0) + 1 : userAccount.likesCountForPoints,
      savesCountForPoints: type === 'save' ? (userAccount.savesCountForPoints || 0) + 1 : userAccount.savesCountForPoints,
      generationsCountForPoints: type === 'generation' ? (userAccount.generationsCountForPoints || 0) + 1 : userAccount.generationsCountForPoints,
      sharesCountForPoints: type === 'share' ? (userAccount.sharesCountForPoints || 0) + 1 : userAccount.sharesCountForPoints,
      referralsCountForPoints: type === 'referral' ? (userAccount.referralsCountForPoints || 0) + 1 : userAccount.referralsCountForPoints,
    };

    setUserAccount(updatedAccount);
    StorageService.saveUserAccount(updatedAccount);
  };

  const loginUser = (email: string, _pass: string, username?: string, avatar?: string): boolean => {
    const existing = StorageService.getUserAccount();
    const account: UserAccount = existing || {
      id: 'user_' + Date.now(),
      name: email.split('@')[0],
      username: username || '@' + email.split('@')[0].toLowerCase(),
      email: email.toLowerCase(),
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isLoggedIn: true,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      points: 5,
      requestsMade: 0,
      likesCountForPoints: 0,
      savesCountForPoints: 0,
      generationsCountForPoints: 0,
      sharesCountForPoints: 0,
      referralsCountForPoints: 0,
    };
    account.isLoggedIn = true;
    if (username) account.username = username;
    if (avatar) account.avatar = avatar;
    StorageService.saveUserAccount(account);
    setUserAccount(account);
    return true;
  };

  const signupUser = (name: string, username: string, email: string, _pass: string, avatar?: string): UserAccount => {
    const account: UserAccount = {
      id: 'user_' + Date.now(),
      name: name || email.split('@')[0],
      username: username || '@' + (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: email.toLowerCase(),
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isLoggedIn: true,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      points: 5,
      requestsMade: 0,
      likesCountForPoints: 0,
      savesCountForPoints: 0,
      generationsCountForPoints: 0,
      sharesCountForPoints: 0,
      referralsCountForPoints: 0,
    };
    StorageService.saveUserAccount(account);
    setUserAccount(account);
    return account;
  };

  const logoutUser = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    StorageService.logoutUserAccount();
    setUserAccount(null);
    showToast('Signed out successfully');
  };

  const saveAiHistoryItem = (item: AIHistoryItem) => {
    const itemWithUser: AIHistoryItem = {
      ...item,
      userId: userAccount?.id || 'guest',
    };
    const updated = StorageService.saveAiHistoryItem(itemWithUser);
    setAiHistory(updated);
  };

  const deleteAiHistoryItem = (id: string) => {
    const updated = StorageService.deleteAiHistoryItem(id);
    setAiHistory(updated);
    showToast('Item deleted from history');
  };

  const clearAiHistory = () => {
    StorageService.clearAiHistory();
    setAiHistory([]);
    showToast('AI Generation history cleared');
  };

  // Data: Fast Cached + Server-Side Driven (SSR-safe initial states)
  const [posts, setPosts] = useState<PromptPost[]>(INITIAL_POSTS);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [tags, setTags] = useState<string[]>([
    'Portrait',
    '35mm',
    'Cinematic',
    'Street Photography',
    'Fashion',
    'Monochrome',
    'Tokyo',
    'Cyberpunk',
    'Studio Ghibli',
    'Japandi',
    'Architecture',
    '3D Render',
    'Pixar',
    'Underwater',
    'Logo',
    'Minimalist',
  ]);

  const allKnownTags = React.useMemo(() => {
    const set = new Set<string>(tags);
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [tags, posts]);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState<boolean>(false);

  // Personalization Taste Profile (Pinterest AI Personalization)
  const [tasteProfile, setTasteProfile] = useState<UserTasteProfile>(INITIAL_TASTE_PROFILE);
  const [isTasteModalOpen, setIsTasteModalOpen] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [popularSearchQueries, setPopularSearchQueries] = useState<string[]>([
    'Traditional saree',
    'Cyberpunk neon portrait',
    'Cinematic golden hour',
    'Vintage 35mm film',
    'Anime masterpiece',
    'Minimalist aesthetic logo',
    'Hyperrealistic 8K model',
    'Indian fashion portrait',
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<
    'trending' | 'most-popular' | 'most-liked' | 'most-copied' | 'newest'
  >('trending');

  // Gemini AI Search State & Cache
  const [aiSearchResults, setAiSearchResults] = useState<AiSearchResult | null>(null);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const aiSearchCacheRef = useRef<Map<string, AiSearchResult>>(new Map());

  const performAiSearch = useCallback(async (query: string): Promise<AiSearchResult | null> => {
    const clean = query.trim();
    if (!clean || clean.length < 2) {
      setAiSearchResults(null);
      setIsAiSearching(false);
      return null;
    }

    const cacheKey = clean.toLowerCase();
    if (aiSearchCacheRef.current.has(cacheKey)) {
      const cached = aiSearchCacheRef.current.get(cacheKey)!;
      setAiSearchResults(cached);
      return cached;
    }

    setIsAiSearching(true);
    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const result: AiSearchResult = {
            query: clean,
            correctedQuery: data.correctedQuery || clean,
            expandedKeywords: Array.isArray(data.expandedKeywords) ? data.expandedKeywords : [clean],
            matchedPostIds: Array.isArray(data.matchedPostIds) ? data.matchedPostIds : [],
            explanation: data.explanation || '',
            isAiPowered: Boolean(data.isAiPowered),
          };
          aiSearchCacheRef.current.set(cacheKey, result);
          setAiSearchResults(result);
          setIsAiSearching(false);
          return result;
        }
      }
    } catch (e) {
      console.warn('AI Semantic Search error:', e);
    } finally {
      setIsAiSearching(false);
    }
    return null;
  }, []);

  const clearAiSearch = useCallback(() => {
    setAiSearchResults(null);
    setIsAiSearching(false);
  }, []);

  // Whenever searchQuery updates, trigger performAiSearch (debounced 300ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setAiSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      void performAiSearch(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performAiSearch]);

  const fetchSearchQueries = async () => {
    try {
      const res = await fetch('/api/search-queries');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.queries) && data.queries.length > 0) {
          setPopularSearchQueries(data.queries.map((q: any) => q.query));
        }
      }
    } catch (e) {
      console.warn('Notice fetching search queries:', e);
    }
  };

  const recordSearchQuery = (queryText: string) => {
    if (!queryText || queryText.trim().length < 2) return;
    const trimmed = queryText.trim();
    setPopularSearchQueries((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 12);
    });
    try {
      fetch('/api/search-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Notice recording search query:', e);
    }
  };

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const applyPlan = useCallback((tier: 'starter' | 'pro' | 'vip') => {
    upgradePlan(tier);
    showToast(`Success! You have unlocked the ${tier.toUpperCase()} plan.`);
  }, [upgradePlan]);

  const isSavingRef = React.useRef(false);

  const syncFromRemote = React.useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      // Fetch posts independently and quickly for fast initial render
      const fetchPosts = fetch('/api/posts?all=true', { cache: 'no-store' })
        .then(async (res) => {
          if (res.ok && !isSavingRef.current) {
            const data = await res.json();
            if (data.success && Array.isArray(data.posts)) {
              setPosts((prevPosts) => {
                if (!prevPosts || prevPosts.length === 0) return data.posts;
                const remoteMap = new Map<string, PromptPost>(data.posts.map((p: PromptPost) => [p.id, p]));
                const updated = prevPosts.map((p) => {
                  const remote = remoteMap.get(p.id);
                  return remote ? { ...p, ...remote } : p;
                });
                const existingIds = new Set(prevPosts.map((p) => p.id));
                const brandNew = data.posts.filter((p: PromptPost) => !existingIds.has(p.id));
                return [...updated, ...brandNew];
              });
              StorageService.saveCachedPosts(data.posts);
            }
          }
        })
        .catch((err) => {
          console.warn('Network sync posts notice (using cache):', err?.message || err);
        })
        .finally(() => setIsLoadingPosts(false));

      const fetchCats = fetch('/api/categories', { cache: 'no-store' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
              setCategories(data.categories);
              StorageService.saveCachedCategories(data.categories);
            }
          }
        })
        .catch((err) => {
          console.warn('Network sync categories notice (using cache):', err?.message || err);
        });

      const fetchTags = fetch('/api/tags', { cache: 'no-store' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.tags)) {
              setTags(data.tags);
              StorageService.saveCachedTags(data.tags);
            }
          }
        })
        .catch((err) => {
          console.warn('Network sync tags notice (using cache):', err?.message || err);
        });

      const fetchSettings = fetch('/api/settings', { cache: 'no-store' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.settings) {
              setSettings(data.settings);
              StorageService.saveCachedSettings(data.settings);
            }
          }
        })
        .catch((err) => {
          console.warn('Network sync settings notice (using cache):', err?.message || err);
        });

      fetchSearchQueries();
      await Promise.allSettled([fetchPosts, fetchCats, fetchTags, fetchSettings]);
    } catch (err) {
      console.warn('Network sync notice (using cache):', err);
      setIsLoadingPosts(false);
    }
  }, []);

  // Initial load and auto-sync on mount / window focus
  useEffect(() => {
    // 1. Read cached localStorage data immediately on client mount
    try {
      if (localStorage.getItem('promptcms_auth') === 'true') {
        setIsAuthenticated(true);
        setCurrentUser({
          id: 'admin-1',
          name: 'Administrator',
          email: 'admin@trendinggeminiprompts.com',
          role: 'Administrator',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        });
      }
      const acc = StorageService.getUserAccount();
      if (acc) setUserAccount(acc);

      const hist = StorageService.getAiHistory();
      if (hist && hist.length > 0) setAiHistory(hist);

      const refImg = StorageService.getPersistentRefImage();
      if (refImg) setPersistentRefImageState(refImg);

      const reqs = StorageService.getPromptRequests();
      if (reqs && reqs.length > 0) setPromptRequests(reqs);

      const cachedPosts = StorageService.getCachedPosts();
      if (cachedPosts && cachedPosts.length > 0) {
        setPosts(cachedPosts);
        setIsLoadingPosts(false);
      }

      const cachedCats = StorageService.getCachedCategories();
      if (cachedCats && cachedCats.length > 0) {
        setCategories(cachedCats);
      }

      const cachedTags = StorageService.getCachedTags();
      if (cachedTags && cachedTags.length > 0) {
        setTags(cachedTags);
      }

      const cachedSettings = StorageService.getCachedSettings();
      if (cachedSettings) {
        setSettings(cachedSettings);
      }

      setBookmarkedIds(StorageService.getBookmarkedIds());
      setLikedIds(StorageService.getLikedIds());
      setTasteProfile(PersonalizationEngine.getProfile());
    } catch (e) {
      console.warn('Error reading local cache on mount:', e);
    }

    // 2. Background sync from server API
    void syncFromRemote();

    // Check Supabase Auth Session (Google OAuth login return or existing session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const existing = StorageService.getUserAccount();
        const account = supabaseUserToUserAccount(session.user, existing);
        setUserAccount(account);
        StorageService.saveUserAccount(account);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const existing = StorageService.getUserAccount();
        const account = supabaseUserToUserAccount(session.user, existing);
        setUserAccount(account);
        StorageService.saveUserAccount(account);
      } else if (_event === 'SIGNED_OUT') {
        setUserAccount(null);
        StorageService.logoutUserAccount();
      }
    });

    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin === window.location.origin) {
        if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              const existing = StorageService.getUserAccount();
              const account = supabaseUserToUserAccount(session.user, existing);
              setUserAccount(account);
              StorageService.saveUserAccount(account);
            }
          });
        }
      }
    };
    window.addEventListener('message', handleAuthMessage);

    const handleFocus = () => {
      if (!isSavingRef.current) {
        void syncFromRemote();
      }
      setBookmarkedIds(StorageService.getBookmarkedIds());
      setLikedIds(StorageService.getLikedIds());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'promptcms_user_bookmarks') {
        setBookmarkedIds(StorageService.getBookmarkedIds());
      }
      if (e.key === 'promptcms_user_likes') {
        setLikedIds(StorageService.getLikedIds());
      }
      if (e.key === 'promptcms_taste_profile') {
        setTasteProfile(PersonalizationEngine.getProfile());
      }
    };

    const handleTasteProfileEvent = () => {
      setTasteProfile(PersonalizationEngine.getProfile());
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('taste_profile_updated', handleTasteProfileEvent);
    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('taste_profile_updated', handleTasteProfileEvent);
    };
  }, [syncFromRemote]);

  const updateTasteProfile = (updates: Partial<UserTasteProfile>) => {
    const current = PersonalizationEngine.getProfile();
    const updated: UserTasteProfile = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    PersonalizationEngine.saveProfile(updated);
    setTasteProfile(updated);
    showToast('Feed taste profile updated!');
  };

  const recordPromptClick = (post: PromptPost) => {
    const updated = PersonalizationEngine.recordView(post);
    setTasteProfile(updated);
  };

  const handleSelectPostWithTracking = (post: PromptPost | null) => {
    setSelectedPost(post);
    if (post) {
      const updated = PersonalizationEngine.recordView(post);
      setTasteProfile(updated);
    }
  };

  const login = (email: string, pass: string): boolean => {
    const success = StorageService.authenticateAdmin(email, pass);
    if (success) {
      setIsAuthenticated(true);
      setCurrentUser(StorageService.getCurrentUser());
      showToast('Welcome back, Admin!');
      return true;
    }
    showToast('Invalid email or password');
    return false;
  };

  const logout = () => {
    StorageService.logoutAdmin();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('public');
    showToast('Logged out successfully');
  };

  const refreshData = () => {
    void syncFromRemote();
  };

  const savePost = async (post: PromptPost): Promise<PromptPost> => {
    isSavingRef.current = true;

    // Immediate optimistic local update
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = post;
        return updated;
      }
      return [post, ...prev];
    });

    try {
      // Send to server database
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
        const savedPost = data.post || post;
        showToast(
          savedPost.status === 'published'
            ? 'Prompt published live to server & homepage!'
            : 'Prompt saved as draft on server'
        );
        return savedPost;
      } else {
        throw new Error(data.error || 'Failed to save post to server');
      }
    } catch (err: any) {
      console.error('Failed to save post on server:', err);
      showToast(err.message || 'Error saving to server database');
      throw err;
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1500);
    }
  };

  const deletePost = async (id: string): Promise<boolean> => {
    isSavingRef.current = true;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setBookmarkedIds((prev) => {
      if (prev.includes(id)) {
        const updated = prev.filter((item) => item !== id);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('auraprompt_user_bookmarks', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }
        return updated;
      }
      return prev;
    });

    try {
      const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
      showToast('Prompt removed from server');
      return true;
    } catch (err) {
      console.error('Failed to delete post on server:', err);
      showToast('Failed to delete post on server');
      return false;
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1500);
    }
  };

  const togglePublishStatus = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const updated = { ...post, status: newStatus as 'published' | 'draft' };
    await savePost(updated);
    showToast(`Status changed to ${newStatus}`);
  };

  const copyPromptToClipboard = (text: string, postId?: string) => {
    navigator.clipboard.writeText(text);
    if (postId) {
      fetch(`/api/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy' }),
      }).catch(() => {});
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, copiesCount: (p.copiesCount || 0) + 1 } : p))
      );
      const post = posts.find((p) => p.id === postId);
      if (post) {
        const updated = PersonalizationEngine.recordCopy(post);
        setTasteProfile(updated);
      }
    }
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'],
      });
    } catch {
      // ignore
    }
    showToast('Prompt copied to clipboard!');
  };

  const toggleLike = (id: string) => {
    const isNowLiked = StorageService.toggleLikeLocal(id);
    setLikedIds(StorageService.getLikedIds());
    fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like' }),
    }).catch(() => {});
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) + (isNowLiked ? 1 : -1)) }
          : p
      )
    );
    const post = posts.find((p) => p.id === id);
    if (post) {
      const updated = PersonalizationEngine.recordLike(post, isNowLiked);
      setTasteProfile(updated);
    }
  };

  const toggleBookmark = (id: string) => {
    const isNowSaved = StorageService.toggleBookmark(id);
    const updatedBookmarks = StorageService.getBookmarkedIds();
    setBookmarkedIds(updatedBookmarks);

    const post = posts.find((p) => p.id === id);
    if (post) {
      const updatedProfile = PersonalizationEngine.recordSave(post, isNowSaved);
      setTasteProfile(updatedProfile);
    }
    showToast(isNowSaved ? 'Saved to bookmarks' : 'Removed from bookmarks');
  };

  const restorePromptCards = async (
    incomingPosts: PromptPost[],
    mode: 'merge' | 'replace' = 'merge',
    incomingCategories?: Category[],
    incomingTags?: string[]
  ): Promise<{ success: boolean; count: number }> => {
    isSavingRef.current = true;
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: incomingPosts,
          mode,
          categories: incomingCategories,
          tags: incomingTags,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
        if (Array.isArray(data.tags)) {
          setTags(data.tags);
        }
        void syncFromRemote();
        showToast(data.message || `Successfully restored ${incomingPosts.length} prompt cards!`);
        return { success: true, count: data.count || incomingPosts.length };
      } else {
        throw new Error(data.error || 'Failed to restore prompts');
      }
    } catch (err: any) {
      console.error('Failed to restore prompts backup:', err);
      showToast(err.message || 'Error restoring prompts backup');
      throw err;
    } finally {
      isSavingRef.current = false;
    }
  };

  const saveCategory = async (cat: Category): Promise<Category> => {
    isSavingRef.current = true;
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = cat;
        return updated;
      }
      return [...prev, cat];
    });

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      showToast('Category saved to server');
      return data.category || cat;
    } catch (err) {
      console.error('Failed to save category on server:', err);
      showToast('Failed to save category on server');
      return cat;
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    isSavingRef.current = true;
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      showToast('Category deleted from server');
      return true;
    } catch (err) {
      console.error('Failed to delete category on server:', err);
      showToast('Failed to delete category on server');
      return false;
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const addTag = async (tag: string): Promise<void> => {
    const cleanTag = tag.trim().replace(/^#/, '');
    if (!cleanTag) return;
    setTags((prev) => (prev.includes(cleanTag) ? prev : [cleanTag, ...prev]));

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: cleanTag }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tags)) {
        setTags(data.tags);
      }
      showToast(`Tag #${cleanTag} added to server`);
    } catch (err) {
      console.error('Failed to save tag on server:', err);
    }
  };

  const deleteTag = async (tag: string): Promise<void> => {
    setTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()));

    try {
      const res = await fetch(`/api/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tags)) {
        setTags(data.tags);
      }
      showToast(`Tag #${tag} deleted from server`);
    } catch (err) {
      console.error('Failed to delete tag on server:', err);
    }
  };

  const saveSettings = async (newSettings: Partial<SiteSettings>): Promise<SiteSettings> => {
    isSavingRef.current = true;
    setSettings((prev) => ({ ...prev, ...newSettings }));

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        showToast('Site settings & popular tags saved to server!');
        return data.settings;
      }
      return { ...settings, ...newSettings };
    } catch (err) {
      console.error('Failed to save settings on server:', err);
      showToast('Error saving settings to server');
      return { ...settings, ...newSettings };
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1500);
    }
  };

  const resetAllData = () => {
    void syncFromRemote();
    showToast('Database synced with server');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        adminSubView,
        setAdminSubView,
        editingPostId,
        setEditingPostId,
        selectedPost,
        setSelectedPost: handleSelectPostWithTracking,
        tasteProfile,
        setTasteProfile,
        updateTasteProfile,
        isTasteModalOpen,
        setIsTasteModalOpen,
        recordPromptClick,
        isAuthenticated,
        currentUser,
        login,
        logout,
        showLoginModal,
        setShowLoginModal,
        userAccount,
        setUserAccount,
        isUserAuthModalOpen,
        setIsUserAuthModalOpen,
        authModalMessage,
        setAuthModalMessage,
        openAuthModal,
        loginUser,
        signupUser,
        logoutUser,
        awardPoints,
        persistentRefImage,
        setPersistentRefImage,
        promptRequests,
        addPromptRequest,
        aiHistory,
        saveAiHistoryItem,
        deleteAiHistoryItem,
        clearAiHistory,
        posts,
        setPosts,
        isLoadingPosts,
        categories,
        tags: allKnownTags,
        settings,
        bookmarkedIds,
        likedIds,
        isBookmarksDrawerOpen,
        setIsBookmarksDrawerOpen,
        searchQuery,
        setSearchQuery,
        isSearchModalOpen,
        setIsSearchModalOpen,
        popularSearchQueries,
        recordSearchQuery,
        aiSearchResults,
        isAiSearching,
        performAiSearch,
        clearAiSearch,
        selectedCategory,
        setSelectedCategory,
        selectedTool,
        setSelectedTool,
        selectedSort,
        setSelectedSort,
        refreshData,
        savePost,
        deletePost,
        togglePublishStatus,
        copyPromptToClipboard,
        toggleLike,
        toggleBookmark,
        restorePromptCards,
        saveCategory,
        deleteCategory,
        addTag,
        deleteTag,
        saveSettings,
        resetAllData,
        showToast,
        toastMessage,
        isProCheckoutModalOpen,
        setIsProCheckoutModalOpen,
        isProUser,
        setIsProUser,
        planTier,
        setPlanTier,
        toolCredits,
        deductToolCredit,
        useToolCredit,
        addToolCredits,
        promptRequestsRemaining,
        upgradePlan,
        isUnlockPremiumModalOpen,
        setIsUnlockPremiumModalOpen,
        lockedPromptContext,
        setLockedPromptContext,
        applyPlan,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-bold flex items-center gap-2 animate-slide-up">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
