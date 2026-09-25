'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import confetti from 'canvas-confetti';
import { PromptPost, Category, SiteSettings, AdminUser, UserAccount, AIHistoryItem, AiSearchResult, PlanTier, PromptRequestItem } from '@/types/prompt';
import { StorageService } from '@/lib/storage';
import { supabase, supabaseUserToUserAccount } from '@/lib/supabase';
import { UserSyncService } from '@/lib/user-sync';
import { INITIAL_POSTS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from '@/lib/initial-data';
import {
  UserTasteProfile,
  PersonalizationEngine,
  INITIAL_TASTE_PROFILE,
} from '@/lib/personalization';

interface AppContextType {
  // Navigation & Views
  currentView: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications';
  setCurrentView: (view: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications') => void;
  adminSubView: 'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history' | 'users' | 'notifications' | 'requested-prompts';
  setAdminSubView: (subView: 'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history' | 'users' | 'notifications' | 'requested-prompts') => void;
  editingPostId: string | null;
  setEditingPostId: (id: string | null) => void;
  selectedPost: PromptPost | null;
  setSelectedPost: (post: PromptPost | null) => void;

  // Personalization & Taste Profile (AI Personalization)
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
  loginUser: (email: string, pass: string, username?: string, avatar?: string) => Promise<boolean>;
  signupUser: (name: string, username: string, email: string, pass: string, avatar?: string) => Promise<UserAccount>;
  logoutUser: () => void;
  awardPoints: (amount: number, type: 'like' | 'save' | 'generation' | 'share' | 'referral') => void;

  // Persistent Reference Photo & Prompt Requests
  persistentRefImage: string | null;
  setPersistentRefImage: (url: string | null) => void;
  promptRequests: PromptRequestItem[];
  addPromptRequest: (requestText: string, category?: string, aiTool?: string) => Promise<boolean>;
  fulfillPromptRequest: (requestId: string, fulfilledPrompt: string, adminNotes?: string, aiTool?: string) => Promise<boolean>;
  deletePromptRequest: (requestId: string) => Promise<boolean>;
  refreshPromptRequests: (userEmail?: string) => Promise<void>;

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
  isNotificationsModalOpen: boolean;
  setIsNotificationsModalOpen: (open: boolean) => void;
  popularSearchQueries: string[];
  recordSearchQuery: (query: string) => void;
  aiSearchResults: AiSearchResult | null;
  isAiSearching: boolean;
  performAiSearch: (query: string, deductQuota?: boolean) => Promise<AiSearchResult | null>;
  clearAiSearch: () => void;
  isAiSearchEnabled: boolean;
  setIsAiSearchEnabled: (enabled: boolean) => void;
  aiSearchRemaining: number;
  setAiSearchRemaining: (num: number) => void;
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
  togglePremiumStatus: (id: string) => Promise<void>;
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
  showToast: (msg: string, type?: string) => void;
  toastMessage: string | null;

  // Cloud Sync for Cross-Device Persistence
  syncUserCloudData: () => Promise<void>;
  isSyncingUserData: boolean;

  // Razorpay Pro Membership & Checkout
  isProCheckoutModalOpen: boolean;
  setIsProCheckoutModalOpen: (open: boolean) => void;
  isProUser: boolean;
  setIsProUser: (isPro: boolean) => void;
  planTier: PlanTier;
  setPlanTier: (tier: PlanTier) => void;
  planExpiresAt: string | null;
  planStartedAt: string | null;
  toolCredits: number;
  deductToolCredit: (amount?: number) => boolean;
  useToolCredit: (amount?: number) => boolean;
  addToolCredits: (amount: number) => void;
  promptRequestsRemaining: number;
  upgradePlan: (tier: 'starter' | 'pro' | 'vip' | 'ultra') => void;

  // Prompt Unlocking with Credits / Subscription
  unlockedPromptIds: string[];
  isPromptUnlocked: (promptId: string, isPremium?: boolean) => boolean;
  unlockPromptWithCredit: (promptId: string) => { success: boolean; message: string };

  isUnlockPremiumModalOpen: boolean;
  setIsUnlockPremiumModalOpen: (open: boolean) => void;
  isFirstLoginModalOpen: boolean;
  setIsFirstLoginModalOpen: (open: boolean) => void;
  lockedPromptContext: PromptPost | null;
  setLockedPromptContext: (post: PromptPost | null) => void;
  applyPlan: (planTier: 'starter' | 'pro' | 'vip' | 'ultra') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  // Navigation
  const [currentView, setCurrentViewState] = useState<'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications'>('public');
  const [adminSubView, setAdminSubView] = useState<
    'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history' | 'users' | 'notifications' | 'requested-prompts'
  >('dashboard');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPostState] = useState<PromptPost | null>(null);

  const setCurrentView = useCallback((view: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications') => {
    setCurrentViewState(view);
    setSelectedPostState(null);
    if (typeof window !== 'undefined') {
      const url = view === 'public' ? '/' : `/${view}`;
      window.history.pushState({ view, selectedPostId: null }, '', url);
    }
  }, []);

  const setSelectedPost = useCallback((post: PromptPost | null) => {
    setSelectedPostState(post);
    if (typeof window !== 'undefined') {
      if (post) {
        window.history.pushState({ view: currentView, selectedPostId: post.id }, '', `#prompt=${post.id}`);
      } else {
        const url = currentView === 'public' ? '/' : `/${currentView}`;
        window.history.replaceState({ view: currentView, selectedPostId: null }, '', url);
      }
    }
  }, [currentView]);

  const postsRef = useRef<PromptPost[]>(INITIAL_POSTS);

  // Listen to popstate (Browser Back/Forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.view) {
        setCurrentViewState(state.view);
      } else {
        const path = window.location.pathname;
        if (path.includes('dashboard')) setCurrentViewState('user-dashboard');
        else if (path.includes('studio')) setCurrentViewState('studio-tool');
        else if (path.includes('foryou')) setCurrentViewState('for-you');
        else if (path.includes('notifications')) setCurrentViewState('notifications');
        else setCurrentViewState('public');
      }

      const hash = window.location.hash;
      if (hash.startsWith('#prompt=')) {
        const promptId = hash.replace('#prompt=', '');
        const found = postsRef.current.find((p) => p.id === promptId);
        if (found) setSelectedPostState(found);
      } else if (state && state.selectedPostId) {
        const found = postsRef.current.find((p) => p.id === state.selectedPostId);
        if (found) setSelectedPostState(found);
      } else {
        setSelectedPostState(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // End-User Account State (For saving history, sync pins & taste profile)
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    return StorageService.getUserAccount();
  });
  const [isUserAuthModalOpen, setIsUserAuthModalOpen] = useState<boolean>(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | null>(null);

  const openAuthModal = useCallback((message?: string) => {
    setAuthModalMessage(message || 'Sign in or create a free account to continue.');
    setIsUserAuthModalOpen(true);
  }, []);

  // Razorpay Pro Membership & Plan Tier State
  const [isProCheckoutModalOpen, setIsProCheckoutModalOpen] = useState<boolean>(false);
  const [isProUser, setIsProUserState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const acc = StorageService.getUserAccount();
      if (acc && acc.isLoggedIn) {
        return localStorage.getItem('auraprompt_pro_member') === 'true';
      }
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
      const acc = StorageService.getUserAccount();
      if (acc && acc.isLoggedIn) {
        const saved = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
        if (['starter', 'pro', 'vip', 'ultra'].includes(saved)) return saved;
      }
    }
    return 'free';
  });

  const [planExpiresAt, setPlanExpiresAtState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auraprompt_plan_expires_at') || null;
    }
    return null;
  });

  const [planStartedAt, setPlanStartedAtState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auraprompt_plan_started_at') || null;
    }
    return null;
  });

  const setPlanTier = useCallback((tier: PlanTier) => {
    setPlanTierState(tier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_plan_tier', tier);
    }
  }, []);

  // Tool Credits (Only active after login - guest has 0 credits until logged in)
  const [toolCredits, setToolCreditsState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const acc = StorageService.getUserAccount();
      if (acc && acc.isLoggedIn) {
        const saved = localStorage.getItem('auraprompt_tool_credits');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) return parsed;
        }
        return 5;
      }
    }
    return 0; // Guest session has 0 credits until login
  });

  const [promptRequestsRemaining, setPromptRequestsRemainingState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const isPro = localStorage.getItem('auraprompt_pro_member') === 'true';
      const tier = localStorage.getItem('auraprompt_plan_tier') || 'free';
      if (isPro) {
        const saved = localStorage.getItem('auraprompt_prompt_requests');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) return parsed;
        }
        if (tier === 'starter') return 1;
        if (tier === 'pro') return 2;
        if (tier === 'vip') return 3;
        if (tier === 'ultra') return 5;
        return 2;
      }
    }
    return 0; // Free user gets 0 prompt requests
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string, type?: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  const deductToolCredit = useCallback((amount: number = 1): boolean => {
    const acc = userAccount || StorageService.getUserAccount();
    if (!acc || !acc.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to use credits.');
      return false;
    }
    let success = false;
    setToolCreditsState((prev) => {
      let currentCredits = prev;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('auraprompt_tool_credits');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) currentCredits = parsed;
        }
      }
      if (currentCredits >= amount) {
        const next = currentCredits - amount;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_tool_credits', next.toString());
        }
        success = true;
        if (acc && acc.id) {
          void UserSyncService.pushUserData(acc.id, acc.email, { toolCredits: next });
        }
        return next;
      }
      return prev;
    });
    return success;
  }, [userAccount, openAuthModal]);

  const useToolCredit = deductToolCredit;

  const addToolCredits = useCallback((amount: number) => {
    setToolCreditsState((prev) => {
      const next = prev + amount;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', next.toString());
      }
      const currentAcc = userAccount || StorageService.getUserAccount();
      if (currentAcc && currentAcc.isLoggedIn) {
        void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, { toolCredits: next });
      }
      return next;
    });
  }, [userAccount]);

  const [isUnlockPremiumModalOpen, setIsUnlockPremiumModalOpen] = useState<boolean>(false);
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const acc = StorageService.getUserAccount();
      if (acc && acc.isLoggedIn && !localStorage.getItem('auraprompt_first_login_claimed')) {
        return true;
      }
    }
    return false;
  });
  const [lockedPromptContext, setLockedPromptContext] = useState<PromptPost | null>(null);

  // First-Time 5 Credits Signup Bonus Logic (No daily credits)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const acc = userAccount || StorageService.getUserAccount();
    if (!acc || !acc.isLoggedIn) return;

    if (!localStorage.getItem('auraprompt_first_login_claimed')) {
      localStorage.setItem('auraprompt_first_login_claimed', 'true');
      setIsFirstLoginModalOpen(true);
      addToolCredits(5);
    }
  }, [userAccount, addToolCredits]);

  // Unlocked Prompts (Unlocked via 1 credit per prompt or subscription)
  const [unlockedPromptIds, setUnlockedPromptIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('auraprompt_unlocked_prompts');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const isPromptUnlocked = useCallback(
    (promptId: string, isPremium?: boolean): boolean => {
      if (!isPremium) return true;
      if (isProUser) return true;
      if (unlockedPromptIds.includes(promptId)) return true;
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('auraprompt_unlocked_prompts');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.includes(promptId)) return true;
          }
        } catch {}
      }
      return false;
    },
    [isProUser, unlockedPromptIds]
  );

  const unlockPromptWithCredit = useCallback(
    (promptId: string): { success: boolean; message: string } => {
      if (isProUser) {
        return { success: true, message: 'Included with Pro Membership!' };
      }
      let existingUnlocked = [...unlockedPromptIds];
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('auraprompt_unlocked_prompts');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) existingUnlocked = Array.from(new Set([...existingUnlocked, ...parsed]));
          }
        } catch {}
      }
      if (existingUnlocked.includes(promptId)) {
        return { success: true, message: 'Prompt is already unlocked!' };
      }

      let currentCredits = toolCredits;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('auraprompt_tool_credits');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) currentCredits = Math.max(toolCredits, parsed);
        }
      }

      if (currentCredits < 1) {
        return {
          success: false,
          message: 'Insufficient credits. 1 credit is required to unlock this premium prompt.',
        };
      }

      const nextCredits = Math.max(0, currentCredits - 1);
      setToolCreditsState(nextCredits);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', nextCredits.toString());
      }

      const nextUnlocked = Array.from(new Set([...existingUnlocked, promptId]));
      setUnlockedPromptIds(nextUnlocked);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(nextUnlocked));
      }

      const currentAcc = userAccount || StorageService.getUserAccount();
      if (currentAcc && currentAcc.isLoggedIn) {
        void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, {
          unlockedPromptIds: nextUnlocked,
          toolCredits: nextCredits,
        });
      }

      return { success: true, message: 'Prompt unlocked successfully! 1 credit used.' };
    },
    [isProUser, unlockedPromptIds, toolCredits, userAccount]
  );

  const upgradePlan = useCallback((tier: 'starter' | 'pro' | 'vip' | 'ultra') => {
    const creditsMap = { starter: 100, pro: 250, vip: 600, ultra: 1500 };
    const requestsMap = { starter: 1, pro: 2, vip: 3, ultra: 5 };
    const pointsMap = { starter: 10, pro: 20, vip: 50, ultra: 100 };
    const aiSearchMap = { starter: 100, pro: 200, vip: 500, ultra: 9999 };

    setIsProUserState(true);
    setPlanTierState(tier);
    const allocatedAiSearch = aiSearchMap[tier] || 100;
    setAiSearchRemaining(allocatedAiSearch);

    const addedCredits = creditsMap[tier];
    const addedRequests = requestsMap[tier];
    const addedPoints = pointsMap[tier];

    let finalCredits = 0;
    setToolCreditsState((prev) => {
      const next = prev + addedCredits;
      finalCredits = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', next.toString());
      }
      return next;
    });

    let finalRequests = 0;
    setPromptRequestsRemainingState((prev) => {
      const next = prev + addedRequests;
      finalRequests = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_prompt_requests', next.toString());
      }
      return next;
    });

    let finalPoints = 0;
    setUserAccount((prev) => {
      if (!prev) return prev;
      const nextPoints = (prev.points || 0) + addedPoints;
      finalPoints = nextPoints;
      const updated = { ...prev, points: nextPoints };
      StorageService.saveUserAccount(updated);
      return updated;
    });

    const now = new Date();
    const planStartedAt = now.toISOString();
    const planExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    setPlanStartedAtState(planStartedAt);
    setPlanExpiresAtState(planExpiresAt);

    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_pro_member', 'true');
      localStorage.setItem('auraprompt_plan_tier', tier);
      localStorage.setItem('auraprompt_plan_started_at', planStartedAt);
      localStorage.setItem('auraprompt_plan_expires_at', planExpiresAt);
    }

    // Persist SaaS Plan upgrade immediately to Supabase cloud
    const currentAcc = userAccount || StorageService.getUserAccount();
    if (currentAcc && currentAcc.isLoggedIn) {
      void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, {
        planTier: tier,
        isProUser: true,
        toolCredits: finalCredits,
        promptRequestsRemaining: finalRequests,
        aiSearchRemaining: allocatedAiSearch,
        points: currentAcc.points ? currentAcc.points + addedPoints : addedPoints,
        planStartedAt,
        planExpiresAt,
      });
    }
  }, [userAccount]);

  // AI Studio History State
  const [aiHistory, setAiHistory] = useState<AIHistoryItem[]>([]);

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
  const [promptRequests, setPromptRequests] = useState<PromptRequestItem[]>([]);

  const refreshPromptRequests = async (userEmail?: string) => {
    try {
      const url = userEmail ? `/api/prompt-requests?email=${encodeURIComponent(userEmail)}` : '/api/prompt-requests';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.requests)) {
          setPromptRequests(json.requests);
          StorageService.setPromptRequests(json.requests);
        }
      }
    } catch (e) {
      console.warn('Notice loading prompt requests from API:', e);
    }
  };

  const addPromptRequest = async (requestText: string, category?: string, aiTool?: string): Promise<boolean> => {
    if (!userAccount || !userAccount.isLoggedIn) {
      openAuthModal('Please sign in to request a prompt.');
      return false;
    }

    if (!requestText.trim()) {
      showToast('Please enter what prompt you would like created.');
      return false;
    }

    if (promptRequestsRemaining <= 0) {
      showToast('You have 0 prompt requests remaining. Upgrade to a plan to request custom prompts!');
      setIsProCheckoutModalOpen(true);
      return false;
    }

    const nextRemaining = Math.max(0, promptRequestsRemaining - 1);
    setPromptRequestsRemainingState(nextRemaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_prompt_requests', String(nextRemaining));
    }
    void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
      promptRequestsRemaining: nextRemaining,
    });

    const newReq: PromptRequestItem = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userAccount.id,
      userEmail: userAccount.email,
      userName: userAccount.name || userAccount.email.split('@')[0],
      userAvatar: userAccount.avatar,
      requestText: requestText.trim(),
      category: category || 'Photorealistic',
      aiTool: aiTool || 'Midjourney',
      status: 'pending',
      createdAt: Date.now(),
      likesCount: 0,
    };

    const updatedList = StorageService.savePromptRequest(newReq);
    setPromptRequests(updatedList);

    try {
      const res = await fetch('/api/prompt-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', request: newReq }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.requests && Array.isArray(json.requests)) {
          setPromptRequests(json.requests);
          StorageService.setPromptRequests(json.requests);
        }
      }
    } catch (e) {
      console.warn('API sync warning for prompt request:', e);
    }

    confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    showToast('Prompt request submitted! We will fulfill it to your dashboard.');
    return true;
  };

  const fulfillPromptRequest = async (
    requestId: string,
    fulfilledPrompt: string,
    adminNotes?: string,
    aiTool?: string
  ): Promise<boolean> => {
    let updatedReq: PromptRequestItem | null = null;
    const nextList = promptRequests.map((r) => {
      if (r.id === requestId) {
        updatedReq = {
          ...r,
          status: 'completed' as const,
          fulfilledPrompt: fulfilledPrompt.trim(),
          fulfilledAt: Date.now(),
          adminNotes: adminNotes?.trim() || undefined,
          aiTool: aiTool || r.aiTool || 'Midjourney',
          fulfilledBy: currentUser?.name || 'Admin',
        };
        return updatedReq;
      }
      return r;
    });

    if (!updatedReq) {
      showToast('Prompt request not found');
      return false;
    }

    setPromptRequests(nextList);
    StorageService.updatePromptRequest(updatedReq);

    try {
      const res = await fetch('/api/prompt-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fulfill',
          requestId,
          fulfilledPrompt,
          adminNotes,
          aiTool,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.requests && Array.isArray(json.requests)) {
          setPromptRequests(json.requests);
          StorageService.setPromptRequests(json.requests);
        }
      }
    } catch (e) {
      console.warn('Fulfillment API sync error:', e);
    }

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    showToast('Request fulfilled! Delivered to user dashboard.');
    return true;
  };

  const deletePromptRequest = async (requestId: string): Promise<boolean> => {
    const nextList = StorageService.deletePromptRequest(requestId);
    setPromptRequests(nextList);

    try {
      const res = await fetch('/api/prompt-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', requestId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.requests && Array.isArray(json.requests)) {
          setPromptRequests(json.requests);
          StorageService.setPromptRequests(json.requests);
        }
      }
    } catch (e) {
      console.warn('Error deleting request via API:', e);
    }

    showToast('Prompt request deleted');
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

    // Sync updated points to cloud
    void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
      points: newPoints,
    });
  };

  const loginUser = async (email: string, _pass: string, username?: string, avatar?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // Aggressively clear any existing session storage to prevent cross-account data leakage
    StorageService.clearAllUserData();

    const account: UserAccount = {
      id: 'u_' + cleanEmail.replace(/[^a-z0-9_]/g, '_'),
      name: username || cleanEmail.split('@')[0],
      username: username ? ('@' + username.replace(/[^a-z0-9]/g, '')) : ('@' + cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')),
      email: cleanEmail,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isLoggedIn: true,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      points: 10,
      requestsMade: 0,
      likesCountForPoints: 0,
      savesCountForPoints: 0,
      generationsCountForPoints: 0,
      sharesCountForPoints: 0,
      referralsCountForPoints: 0,
    };

    StorageService.saveUserAccount(account);
    setUserAccount(account);
    setAiSearchRemaining(5);

    // Reconcile and load all cloud data strictly for this specific account from Supabase
    try {
      const synced = await UserSyncService.reconcileOnLogin(account);
      setBookmarkedIds(synced.bookmarkedIds || []);
      StorageService.setBookmarkedIds(synced.bookmarkedIds || []);

      setLikedIds(synced.likedIds || []);
      StorageService.setLikedIds(synced.likedIds || []);

      if (synced.tasteProfile) {
        setTasteProfile(synced.tasteProfile);
        PersonalizationEngine.saveProfile(synced.tasteProfile);
      }

      setAiHistory(synced.aiHistory || []);
      StorageService.setAiHistory(synced.aiHistory || []);

      if (synced.points !== undefined) {
        setUserAccount((prev) => (prev ? { ...prev, points: synced.points } : prev));
      }

      setPlanTierState(synced.planTier || 'free');
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_plan_tier', synced.planTier || 'free');
      }

      setIsProUserState(synced.isProUser || false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_pro_member', String(synced.isProUser || false));
      }

      setToolCreditsState(synced.toolCredits ?? 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', String(synced.toolCredits ?? 5));
      }

      setUnlockedPromptIds(synced.unlockedPromptIds || []);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds || []));
        if (synced.planStartedAt) {
          localStorage.setItem('auraprompt_plan_started_at', synced.planStartedAt);
          setPlanStartedAtState(synced.planStartedAt);
        } else {
          setPlanStartedAtState(null);
          localStorage.removeItem('auraprompt_plan_started_at');
        }
        if (synced.planExpiresAt) {
          localStorage.setItem('auraprompt_plan_expires_at', synced.planExpiresAt);
          setPlanExpiresAtState(synced.planExpiresAt);
        } else {
          setPlanExpiresAtState(null);
          localStorage.removeItem('auraprompt_plan_expires_at');
        }
      }
    } catch (e) {
      console.warn('Login reconciliation sync error:', e);
    }

    return true;
  };

  const signupUser = async (name: string, username: string, email: string, _pass: string, avatar?: string): Promise<UserAccount> => {
    const cleanEmail = email.trim().toLowerCase();

    // Aggressively clear any existing session storage to prevent cross-account data leakage
    StorageService.clearAllUserData();

    const account: UserAccount = {
      id: 'u_' + cleanEmail.replace(/[^a-z0-9_]/g, '_'),
      name: name || cleanEmail.split('@')[0],
      username: username ? ('@' + username.replace(/[^a-z0-9]/g, '')) : ('@' + cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')),
      email: cleanEmail,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isLoggedIn: true,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      points: 10,
      requestsMade: 0,
      likesCountForPoints: 0,
      savesCountForPoints: 0,
      generationsCountForPoints: 0,
      sharesCountForPoints: 0,
      referralsCountForPoints: 0,
    };

    StorageService.saveUserAccount(account);
    setUserAccount(account);

    try {
      const synced = await UserSyncService.reconcileOnLogin(account);
      setBookmarkedIds(synced.bookmarkedIds || []);
      StorageService.setBookmarkedIds(synced.bookmarkedIds || []);
      setLikedIds(synced.likedIds || []);
      StorageService.setLikedIds(synced.likedIds || []);
      setAiHistory(synced.aiHistory || []);
      StorageService.setAiHistory(synced.aiHistory || []);
      setPlanTierState(synced.planTier || 'free');
      setIsProUserState(synced.isProUser || false);
      setToolCreditsState(synced.toolCredits ?? 5);
      setUnlockedPromptIds(synced.unlockedPromptIds || []);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_plan_tier', synced.planTier || 'free');
        localStorage.setItem('auraprompt_pro_member', String(synced.isProUser || false));
        localStorage.setItem('auraprompt_tool_credits', String(synced.toolCredits ?? 5));
        localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds || []));
      }
    } catch (e) {
      console.warn('Signup reconciliation sync error:', e);
    }

    return account;
  };

  const logoutUser = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }

    // Complete cleanup of all local and session cache
    StorageService.clearAllUserData();

    // Reset all React state to unauthenticated guest values
    setUserAccount(null);
    setIsProUserState(false);
    setPlanTierState('free');
    setPlanStartedAtState(null);
    setPlanExpiresAtState(null);
    setToolCreditsState(0);
    setPromptRequestsRemainingState(0);
    setUnlockedPromptIds([]);
    setBookmarkedIds([]);
    setLikedIds([]);
    setAiHistory([]);
    setTasteProfile(INITIAL_TASTE_PROFILE);

    showToast('Signed out successfully. Session cache cleared.');
  };

  const saveAiHistoryItem = (item: AIHistoryItem) => {
    if (!userAccount || !userAccount.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to save AI prompts to your history.');
      return;
    }

    const isAlreadySaved = aiHistory.some(h => h.id === item.id);
    if (!isAlreadySaved && !isProUser && (bookmarkedIds.length + aiHistory.length >= 10)) {
      showToast('Free user limit reached: 10 combined saves max (bookmarks + history). Upgrade to a paid monthly subscription for unlimited saves!');
      setIsProCheckoutModalOpen(true);
      return;
    }

    const itemWithUser: AIHistoryItem = {
      ...item,
      userId: userAccount.id,
    };
    const updated = StorageService.saveAiHistoryItem(itemWithUser);
    setAiHistory(updated);

    void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
      aiHistory: updated,
    });
  };

  const deleteAiHistoryItem = (id: string) => {
    if (!userAccount || !userAccount.isLoggedIn) return;
    const updated = StorageService.deleteAiHistoryItem(id);
    setAiHistory(updated);
    void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
      aiHistory: updated,
    });
    showToast('Item deleted from history');
  };

  const clearAiHistory = () => {
    if (!userAccount || !userAccount.isLoggedIn) return;
    StorageService.clearAiHistory();
    setAiHistory([]);
    void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
      aiHistory: [],
    });
    showToast('AI Generation history cleared');
  };

  // Data: Fast Cached + Server-Side Driven (SSR-safe initial states)
  const [posts, setPosts] = useState<PromptPost[]>(INITIAL_POSTS);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
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
  const lastBookmarkToggleTimeRef = useRef<number>(0);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState<boolean>(false);

  // Personalization Taste Profile (AI Personalization)
  const [tasteProfile, setTasteProfile] = useState<UserTasteProfile>(INITIAL_TASTE_PROFILE);
  const [isTasteModalOpen, setIsTasteModalOpen] = useState<boolean>(false);

  // Cloud sync state for cross-device synchronization
  const [isSyncingUserData, setIsSyncingUserData] = useState<boolean>(false);
  const tasteProfileDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const debounceSyncTasteProfile = (userId?: string, email?: string, profile?: UserTasteProfile) => {
    if ((!userId && !email) || !profile) return;
    if (tasteProfileDebounceRef.current) {
      clearTimeout(tasteProfileDebounceRef.current);
    }
    tasteProfileDebounceRef.current = setTimeout(() => {
      void UserSyncService.pushUserData(userId, email, { tasteProfile: profile });
    }, 1500);
  };

  const syncUserCloudData = async () => {
    const acc = userAccount || StorageService.getUserAccount();
    if (!acc || !acc.isLoggedIn) return;
    try {
      setIsSyncingUserData(true);
      const synced = await UserSyncService.reconcileOnLogin(acc);
      setBookmarkedIds(synced.bookmarkedIds || []);
      setLikedIds(synced.likedIds || []);
      if (synced.tasteProfile) {
        setTasteProfile(synced.tasteProfile);
        PersonalizationEngine.saveProfile(synced.tasteProfile);
      }
      if (synced.aiHistory?.length) setAiHistory(synced.aiHistory);
      if (synced.points !== undefined) {
        setUserAccount((prev) => (prev ? { ...prev, points: synced.points } : prev));
      }
      if (synced.planTier) {
        setPlanTierState(synced.planTier);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_plan_tier', synced.planTier);
      }
      if (synced.isProUser !== undefined) {
        setIsProUserState(synced.isProUser);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_pro_member', String(synced.isProUser));
      }
      if (synced.toolCredits !== undefined) {
        const localSaved = typeof window !== 'undefined' ? parseInt(localStorage.getItem('auraprompt_tool_credits') || '0', 10) : toolCredits;
        const resolved = Math.max(toolCredits, localSaved, synced.toolCredits);
        setToolCreditsState(resolved);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_tool_credits', String(resolved));
      }
      if (synced.unlockedPromptIds) {
        setUnlockedPromptIds(synced.unlockedPromptIds);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds));
      }
    } catch (e) {
      console.warn('Sync cloud data notice:', e);
    } finally {
      setIsSyncingUserData(false);
    }
  };

  // Server-side session validator that runs strictly once on initial app load when logged in
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentAcc = userAccount || StorageService.getUserAccount();
    if (!currentAcc || !currentAcc.isLoggedIn) return;

    let isMounted = true;
    const validateServerSession = async () => {
      try {
        const synced = await UserSyncService.validateSession(currentAcc.id, currentAcc.email);
        if (!synced || !isMounted) return;

        if (Date.now() - lastBookmarkToggleTimeRef.current > 5000) {
          setBookmarkedIds(synced.bookmarkedIds || []);
          StorageService.setBookmarkedIds(synced.bookmarkedIds || []);
        }

        setLikedIds(synced.likedIds || []);
        StorageService.setLikedIds(synced.likedIds || []);

        if (synced.tasteProfile) {
          setTasteProfile(synced.tasteProfile);
          PersonalizationEngine.saveProfile(synced.tasteProfile);
        }

        setAiHistory(synced.aiHistory || []);
        StorageService.setAiHistory(synced.aiHistory || []);

        if (synced.points !== undefined) {
          setUserAccount((prev) => (prev ? { ...prev, points: synced.points ?? prev.points, name: synced.name || prev.name, avatar: synced.avatar || prev.avatar } : prev));
        }

        const tier = synced.planTier || 'free';
        setPlanTierState(tier);
        localStorage.setItem('auraprompt_plan_tier', tier);

        const isPro = Boolean(synced.isProUser || tier !== 'free');
        setIsProUserState(isPro);
        localStorage.setItem('auraprompt_pro_member', String(isPro));

        if (synced.toolCredits !== undefined) {
          const localSaved = typeof window !== 'undefined' ? parseInt(localStorage.getItem('auraprompt_tool_credits') || '0', 10) : toolCredits;
          const resolved = Math.max(toolCredits, localSaved, synced.toolCredits);
          setToolCreditsState(resolved);
          localStorage.setItem('auraprompt_tool_credits', String(resolved));
        }

        if (synced.unlockedPromptIds) {
          setUnlockedPromptIds(synced.unlockedPromptIds);
          localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds));
        }

        if (synced.planExpiresAt && !localStorage.getItem('auraprompt_plan_expires_at')) {
          localStorage.setItem('auraprompt_plan_expires_at', synced.planExpiresAt);
          setPlanExpiresAtState(synced.planExpiresAt);
        } else if (!planExpiresAt && synced.planExpiresAt) {
          setPlanExpiresAtState(synced.planExpiresAt);
          localStorage.setItem('auraprompt_plan_expires_at', synced.planExpiresAt);
        }
      } catch (err) {
        console.warn('Server-side session validation error:', err);
      }
    };

    void validateServerSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Immediate sync upon user login
  useEffect(() => {
    if (userAccount?.isLoggedIn) {
      void syncUserCloudData();
    }
  }, [userAccount?.isLoggedIn]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
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
  const [selectedCategory, setSelectedCategoryState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedCategory') || 'all';
    }
    return 'all';
  });

  const setSelectedCategory = (cat: string) => {
    setSelectedCategoryState(cat);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCategory', cat);
    }
  };
  const [selectedTool, setSelectedTool] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<
    'trending' | 'most-popular' | 'most-liked' | 'most-copied' | 'newest'
  >('newest');

  // Gemini AI Search State & Cache
  const [aiSearchResults, setAiSearchResults] = useState<AiSearchResult | null>(null);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const aiSearchCacheRef = useRef<Map<string, AiSearchResult>>(new Map());

  const [isAiSearchEnabled, setIsAiSearchEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_ai_search_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default ON
  });

  const setIsAiSearchEnabled = useCallback((enabled: boolean) => {
    setIsAiSearchEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_ai_search_enabled', String(enabled));
    }
  }, []);

  const [aiSearchRemaining, setAiSearchRemainingState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const isPro = localStorage.getItem('auraprompt_pro_member') === 'true';
      if (isPro) return 999;
      const saved = localStorage.getItem('auraprompt_ai_search_remaining');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 5; // 5 free AI searches lifetime for free users
  });

  const setAiSearchRemaining = useCallback((num: number) => {
    setAiSearchRemainingState(num);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_ai_search_remaining', num.toString());
    }
  }, []);

  const aiSearchDeductedRef = useRef<Set<string>>(new Set());

  const performAiSearch = useCallback(async (query: string, deductQuota: boolean = true): Promise<AiSearchResult | null> => {
    const clean = query.trim();
    if (!clean || clean.length < 2 || !isAiSearchEnabled) {
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

    if (!isProUser && aiSearchRemaining <= 0) {
      showToast('You have used all of your AI search quota, please upgrade plan to unlock more limit');
      setIsProCheckoutModalOpen(true);
      setIsAiSearchEnabled(false);
      return null;
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

          // Deduct quota only once per unique query when successfully completed and deductQuota is true
          if (!isProUser && deductQuota && !aiSearchDeductedRef.current.has(cacheKey)) {
            aiSearchDeductedRef.current.add(cacheKey);
            setAiSearchRemainingState((prev) => {
              const next = Math.max(0, prev - 1);
              if (typeof window !== 'undefined') {
                localStorage.setItem('auraprompt_ai_search_remaining', next.toString());
              }
              return next;
            });
          }

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
  }, [isAiSearchEnabled, isProUser, aiSearchRemaining, setAiSearchRemaining, showToast, setIsProCheckoutModalOpen, setIsAiSearchEnabled]);

  const clearAiSearch = useCallback(() => {
    setAiSearchResults(null);
    setIsAiSearching(false);
  }, []);

  // Whenever searchQuery updates, trigger performAiSearch if enabled (debounced 300ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isAiSearchEnabled || !q || q.length < 2) {
      setAiSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      void performAiSearch(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isAiSearchEnabled, performAiSearch]);

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

  const applyPlan = useCallback((tier: 'starter' | 'pro' | 'vip' | 'ultra') => {
    upgradePlan(tier);
    showToast(`Success! You have unlocked the ${tier.toUpperCase()} plan.`);
  }, [upgradePlan, showToast]);

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
      if (acc && acc.isLoggedIn) {
        setUserAccount(acc);
        const hist = StorageService.getAiHistory(acc.id);
        if (hist && hist.length > 0) setAiHistory(hist);
        setBookmarkedIds(StorageService.getBookmarkedIds());
        setLikedIds(StorageService.getLikedIds());
        setTasteProfile(PersonalizationEngine.getProfile());
      } else {
        // Guest user: strictly blank/unauthenticated state
        setUserAccount(null);
        setAiHistory([]);
        setBookmarkedIds([]);
        setLikedIds([]);
        setIsProUserState(false);
        setPlanTierState('free');
        setToolCreditsState(0);
      }

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
    } catch (e) {
      console.warn('Error reading local cache on mount:', e);
    }

    // 2. Background sync from server API
    void syncFromRemote();
    const currentAcc = StorageService.getUserAccount();
    void refreshPromptRequests(currentAcc?.email);

    const applySynced = (synced: any) => {
      setBookmarkedIds(synced.bookmarkedIds || []);
      StorageService.setBookmarkedIds(synced.bookmarkedIds || []);
      setLikedIds(synced.likedIds || []);
      StorageService.setLikedIds(synced.likedIds || []);
      if (synced.promptRequests && Array.isArray(synced.promptRequests)) {
        setPromptRequests(synced.promptRequests);
        StorageService.setPromptRequests(synced.promptRequests);
      }
      if (synced.tasteProfile) {
        setTasteProfile(synced.tasteProfile);
        PersonalizationEngine.saveProfile(synced.tasteProfile);
      }
      setAiHistory(synced.aiHistory || []);
      StorageService.setAiHistory(synced.aiHistory || []);
      if (synced.points !== undefined) {
        setUserAccount((prev) => (prev ? { ...prev, points: synced.points } : prev));
      }
      setPlanTierState(synced.planTier || 'free');
      if (typeof window !== 'undefined') localStorage.setItem('auraprompt_plan_tier', synced.planTier || 'free');
      setIsProUserState(synced.isProUser || false);
      if (typeof window !== 'undefined') localStorage.setItem('auraprompt_pro_member', String(synced.isProUser || false));
      setToolCreditsState(synced.toolCredits ?? 5);
      if (typeof window !== 'undefined') localStorage.setItem('auraprompt_tool_credits', String(synced.toolCredits ?? 5));
      setUnlockedPromptIds(synced.unlockedPromptIds || []);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds || []));
        if (synced.planStartedAt) {
          localStorage.setItem('auraprompt_plan_started_at', synced.planStartedAt);
        }
        if (synced.planExpiresAt) {
          localStorage.setItem('auraprompt_plan_expires_at', synced.planExpiresAt);
          setPlanExpiresAtState(synced.planExpiresAt);
        } else {
          setPlanExpiresAtState(null);
          localStorage.removeItem('auraprompt_plan_expires_at');
        }
      }
    };

    // Check Supabase Auth Session (Google OAuth login return or existing session)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const existing = StorageService.getUserAccount();
        const account = supabaseUserToUserAccount(session.user, existing);
        setUserAccount(account);
        StorageService.saveUserAccount(account);

        // Load all cloud bookmarks, likes, points, history, and taste profile
        const synced = await UserSyncService.reconcileOnLogin(account);
        applySynced(synced);
      } else {
        // If not authenticated in Supabase, check if user was stored locally
        const acc = StorageService.getUserAccount();
        if (acc && acc.isLoggedIn) {
          UserSyncService.reconcileOnLogin(acc).then(applySynced);
        } else {
          // Strictly clear guest data
          setUserAccount(null);
          setAiHistory([]);
          setBookmarkedIds([]);
          setLikedIds([]);
          setIsProUserState(false);
          setPlanTierState('free');
          setToolCreditsState(0);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const existing = StorageService.getUserAccount();
        const account = supabaseUserToUserAccount(session.user, existing);
        setUserAccount(account);
        StorageService.saveUserAccount(account);

        const synced = await UserSyncService.reconcileOnLogin(account);
        applySynced(synced);
      } else if (_event === 'SIGNED_OUT') {
        setUserAccount(null);
        setIsProUserState(false);
        setPlanTierState('free');
        setToolCreditsState(0);
        setPromptRequestsRemainingState(0);
        setUnlockedPromptIds([]);
        setBookmarkedIds([]);
        setLikedIds([]);
        setAiHistory([]);
        setTasteProfile(INITIAL_TASTE_PROFILE);
        StorageService.clearAllUserData();
      }
    });

    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin === window.location.origin) {
        if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              const existing = StorageService.getUserAccount();
              const account = supabaseUserToUserAccount(session.user, existing);
              setUserAccount(account);
              StorageService.saveUserAccount(account);

              const synced = await UserSyncService.reconcileOnLogin(account);
              applySynced(synced);
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
      const acc = StorageService.getUserAccount();
      if (acc && acc.isLoggedIn) {
        setBookmarkedIds(StorageService.getBookmarkedIds());
        setLikedIds(StorageService.getLikedIds());
        setTasteProfile(PersonalizationEngine.getProfile());

        // Check if user is logged in and pull latest cross-device bookmarks and taste profile
        UserSyncService.pullUserData(acc.id, acc.email).then((remote) => {
          if (remote) {
            if (remote.bookmarkedIds) {
              setBookmarkedIds(remote.bookmarkedIds);
              try {
                localStorage.setItem('promptcms_user_bookmarks', JSON.stringify(remote.bookmarkedIds));
              } catch {}
            }
            if (remote.tasteProfile) {
              setTasteProfile(remote.tasteProfile);
              PersonalizationEngine.saveProfile(remote.tasteProfile);
            }
          }
        }).catch(() => {});
      } else {
        setBookmarkedIds([]);
        setLikedIds([]);
        setAiHistory([]);
      }
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

    // Persist to Supabase database for logged-in user
    if (userAccount && userAccount.isLoggedIn) {
      void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
        tasteProfile: updated,
      });
    }
  };

  const handleSetTasteProfile = (newProfile: UserTasteProfile) => {
    PersonalizationEngine.saveProfile(newProfile);
    setTasteProfile(newProfile);
    if (userAccount && userAccount.isLoggedIn) {
      void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
        tasteProfile: newProfile,
      });
    }
  };

  const recordPromptClick = (post: PromptPost) => {
    const updated = PersonalizationEngine.recordView(post);
    setTasteProfile(updated);
    if (userAccount && userAccount.isLoggedIn) {
      debounceSyncTasteProfile(userAccount.id, userAccount.email, updated);
    }
  };

  const handleSelectPostWithTracking = (post: PromptPost | null) => {
    setSelectedPost(post);
    if (post) {
      const updated = PersonalizationEngine.recordView(post);
      setTasteProfile(updated);
      if (userAccount && userAccount.isLoggedIn) {
        debounceSyncTasteProfile(userAccount.id, userAccount.email, updated);
      }
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
            localStorage.setItem('promptcms_user_bookmarks', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }
        if (userAccount && userAccount.isLoggedIn) {
          void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
            bookmarkedIds: updated,
          });
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

  const togglePremiumStatus = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const newIsPremium = !post.isPremium;
    const updated: PromptPost = {
      ...post,
      isPremium: newIsPremium,
      parameters: {
        ...(post.parameters || {}),
        isPremium: newIsPremium,
      },
    };
    await savePost(updated);
    showToast(newIsPremium ? 'Prompt upgraded to PRO Premium' : 'Prompt changed to Free');
  };

  const copyPromptToClipboard = (text: string, postId?: string) => {
    if (postId) {
      const post = posts.find((p) => p.id === postId);
      if (post && post.isPremium) {
        const unlocked = isPromptUnlocked(postId, post.isPremium);
        if (!unlocked) {
          setLockedPromptContext(post);
          setIsUnlockPremiumModalOpen(true);
          showToast('🔒 Access Denied: Premium prompt requires 1 credit or Pro subscription to copy/access!');
          return;
        }
      }
    }
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
        if (userAccount && userAccount.isLoggedIn) {
          void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
            tasteProfile: updated,
          });
        }
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
    const updatedLikes = StorageService.getLikedIds();
    setLikedIds(updatedLikes);
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
    let updatedProfile = tasteProfile;
    if (post) {
      updatedProfile = PersonalizationEngine.recordLike(post, isNowLiked);
      setTasteProfile(updatedProfile);
    }

    // Push updated likes and taste profile to Supabase cloud
    if (userAccount && userAccount.isLoggedIn) {
      void UserSyncService.pushUserData(userAccount.id, userAccount.email, {
        likedIds: updatedLikes,
        tasteProfile: updatedProfile,
      });
    }
  };

  const toggleBookmark = (id: string) => {
    const currentAcc = userAccount || StorageService.getUserAccount();
    if (!currentAcc || !currentAcc.isLoggedIn) {
      openAuthModal('Sign in or create a free account to save prompts to your private collection.');
      return;
    }

    const currentBookmarks = StorageService.getBookmarkedIds();
    const isCurrentlyBookmarked = currentBookmarks.includes(id);
    if (!isCurrentlyBookmarked && !isProUser && (currentBookmarks.length + aiHistory.length >= 10)) {
      showToast('Free user limit reached: 10 combined saves max (bookmarks + history). Upgrade to a paid monthly subscription for unlimited saves!');
      setIsProCheckoutModalOpen(true);
      return;
    }

    const isNowSaved = StorageService.toggleBookmark(id);
    const updatedBookmarks = StorageService.getBookmarkedIds();
    setBookmarkedIds([...updatedBookmarks]);
    lastBookmarkToggleTimeRef.current = Date.now();

    const post = posts.find((p) => p.id === id);
    let updatedProfile = tasteProfile;
    if (post) {
      updatedProfile = PersonalizationEngine.recordSave(post, isNowSaved);
      setTasteProfile(updatedProfile);
    }

    // Push updated bookmarks and taste profile to Supabase cloud
    void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, {
      bookmarkedIds: updatedBookmarks,
      tasteProfile: updatedProfile,
    });

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
        setTasteProfile: handleSetTasteProfile,
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
        fulfillPromptRequest,
        deletePromptRequest,
        refreshPromptRequests,
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
        isNotificationsModalOpen,
        setIsNotificationsModalOpen,
        popularSearchQueries,
        recordSearchQuery,
        aiSearchResults,
        isAiSearching,
        performAiSearch,
        clearAiSearch,
        isAiSearchEnabled,
        setIsAiSearchEnabled,
        aiSearchRemaining,
        setAiSearchRemaining,
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
        togglePremiumStatus,
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
        syncUserCloudData,
        isSyncingUserData,
        showToast,
        toastMessage,
        isProCheckoutModalOpen,
        setIsProCheckoutModalOpen,
        isProUser,
        setIsProUser,
        planTier,
        setPlanTier,
        planExpiresAt,
        planStartedAt,
        toolCredits,
        deductToolCredit,
        useToolCredit,
        addToolCredits,
        promptRequestsRemaining,
        upgradePlan,
        unlockedPromptIds,
        isPromptUnlocked,
        unlockPromptWithCredit,
        isUnlockPremiumModalOpen,
        setIsUnlockPremiumModalOpen,
        isFirstLoginModalOpen,
        setIsFirstLoginModalOpen,
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

export const useBookmarks = () => {
  const {
    bookmarkedIds,
    toggleBookmark,
    isBookmarksDrawerOpen,
    setIsBookmarksDrawerOpen,
    posts,
    userAccount,
    syncUserCloudData,
    isSyncingUserData,
  } = useApp();

  const isBookmarked = (id: string) => bookmarkedIds.includes(id);
  const bookmarkedPosts = posts.filter((p) => bookmarkedIds.includes(p.id));

  return {
    bookmarkedIds,
    isBookmarked,
    toggleBookmark,
    bookmarkedPosts,
    isBookmarksDrawerOpen,
    setIsBookmarksDrawerOpen,
    isLoggedIn: !!userAccount?.isLoggedIn,
    syncBookmarks: syncUserCloudData,
    isSyncing: isSyncingUserData,
  };
};

export const useTasteProfile = () => {
  const {
    tasteProfile,
    setTasteProfile,
    updateTasteProfile,
    isTasteModalOpen,
    setIsTasteModalOpen,
    recordPromptClick,
    userAccount,
    syncUserCloudData,
    isSyncingUserData,
  } = useApp();

  return {
    tasteProfile,
    setTasteProfile,
    updateTasteProfile,
    isTasteModalOpen,
    setIsTasteModalOpen,
    recordPromptClick,
    genderVibe: tasteProfile.genderVibe || 'all',
    favoriteStyles: tasteProfile.favoriteStyles || [],
    favoriteTools: tasteProfile.favoriteTools || [],
    tasteSummary: PersonalizationEngine.getTasteSummary(tasteProfile),
    isLoggedIn: !!userAccount?.isLoggedIn,
    syncTasteProfile: syncUserCloudData,
    isSyncing: isSyncingUserData,
  };
};

