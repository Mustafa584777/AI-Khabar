'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { PromptPost, Category, SiteSettings, AdminUser, UserAccount, AIHistoryItem, AiSearchResult, PlanTier, PromptRequestItem, QueuedPlan } from '@/types/prompt';
import { StorageService } from '@/lib/storage';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { UserSyncService } from '@/lib/user-sync';
import { INITIAL_POSTS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from '@/lib/initial-data';
import {
  UserTasteProfile,
  PersonalizationEngine,
  INITIAL_TASTE_PROFILE,
} from '@/lib/personalization';
import {
  PLAN_CONFIGS,
  getPlanConfig,
  calculatePlanDates,
  formatExpiryDateWithHour,
  getPlanFeaturesForCycle,
  BillingCycle,
} from '@/lib/plans';

interface AppContextType {
  // Navigation & Views
  currentView: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications';
  setCurrentView: (view: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications') => void;
  adminSubView: 'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history' | 'users' | 'notifications';
  setAdminSubView: (subView: 'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history' | 'users' | 'notifications') => void;
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
  loginUser: (email: string, pass: string, username?: string, avatar?: string, userId?: string) => Promise<boolean>;
  signupUser: (name: string, username: string, email: string, pass: string, avatar?: string, userId?: string) => Promise<UserAccount>;
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
  deletePosts: (ids: string[]) => Promise<boolean>;
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
  queuedPlan: QueuedPlan | null;
  toolCredits: number;
  deductToolCredit: (amount?: number) => boolean;
  useToolCredit: (amount?: number) => boolean;
  addToolCredits: (amount: number) => void;
  promptRequestsRemaining: number;
  upgradePlan: (tier: 'starter' | 'pro' | 'vip' | 'ultra', serverData?: any, isQueued?: boolean, cycle?: 'monthly' | 'yearly') => void;

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
  const router = useRouter();

  // Navigation
  const [currentView, setCurrentViewState] = useState<'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('dashboard')) return 'user-dashboard';
      if (path.includes('create') || path.includes('studio')) return 'studio-tool';
      if (path.includes('notifications')) return 'notifications';
      if (path.includes('admin')) return 'admin';
    }
    return 'public';
  });

  useEffect(() => {
    if (pathname) {
      if (pathname.includes('dashboard')) setCurrentViewState('user-dashboard');
      else if (pathname.includes('create') || pathname.includes('studio')) setCurrentViewState('studio-tool');
      else if (pathname.includes('notifications')) setCurrentViewState('notifications');
      else if (pathname.includes('admin')) setCurrentViewState('admin');
      else setCurrentViewState('public');
    }
  }, [pathname]);

  const [adminSubView, setAdminSubView] = useState<
    'dashboard' | 'posts' | 'new-post' | 'edit-post' | 'categories' | 'ai-generator' | 'settings' | 'backup-restore' | 'search-history' | 'users' | 'notifications'
  >('dashboard');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPostState] = useState<PromptPost | null>(null);

  const setCurrentView = useCallback((view: 'public' | 'admin' | 'user-dashboard' | 'studio-tool' | 'for-you' | 'notifications') => {
    setSelectedPostState(null);
    if (view === 'public' || view === 'for-you') {
      router.push('/');
    } else if (view === 'user-dashboard') {
      router.push('/dashboard');
    } else if (view === 'studio-tool') {
      router.push('/create');
    } else if (view === 'notifications') {
      router.push('/notifications');
    } else if (view === 'admin') {
      router.push('/admin');
    }
  }, [router]);

  const setSelectedPost = useCallback((post: PromptPost | null) => {
    setSelectedPostState(post);
    if (typeof window !== 'undefined') {
      if (post) {
        window.history.pushState({ selectedPostId: post.id }, '', `#prompt=${post.id}`);
      } else {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState({ selectedPostId: null }, '', cleanUrl);
      }
    }
  }, []);

  const postsRef = useRef<PromptPost[]>(INITIAL_POSTS);

  // Listen to popstate (Browser Back/Forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const hash = window.location.hash;
      const state = event.state;

      if (hash.startsWith('#prompt=')) {
        const promptId = hash.replace('#prompt=', '');
        const found = postsRef.current.find((p) => p.id === promptId);
        if (found) setSelectedPostState(found);
        else setSelectedPostState(null);
      } else if (state && state.selectedPostId) {
        const found = postsRef.current.find((p) => p.id === state.selectedPostId);
        if (found) setSelectedPostState(found);
        else setSelectedPostState(null);
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
      const savedPro = localStorage.getItem('auraprompt_pro_member');
      const savedTier = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
      const isPaidTier = savedTier && ['starter', 'pro', 'vip', 'ultra'].includes(savedTier);
      const isAccPaid = acc && ((acc.planTier && acc.planTier !== 'free') || acc.isProUser || acc.isPremium);
      if (savedPro === 'true' || isPaidTier || isAccPaid) {
        return true;
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
      const saved = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
      if (['starter', 'pro', 'vip', 'ultra'].includes(saved)) return saved;
      const acc = StorageService.getUserAccount();
      if (acc?.planTier && ['starter', 'pro', 'vip', 'ultra'].includes(acc.planTier)) return acc.planTier;
      if (acc?.membershipPlan && ['starter', 'pro', 'vip'].includes(acc.membershipPlan)) return acc.membershipPlan;
    }
    return 'free';
  });

  const [planExpiresAt, setPlanExpiresAtState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_plan_expires_at');
      if (saved) return saved;
      const acc = StorageService.getUserAccount();
      if (acc?.planExpiresAt) return acc.planExpiresAt;
    }
    return null;
  });

  const [planStartedAt, setPlanStartedAtState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_plan_started_at');
      if (saved) return saved;
      const acc = StorageService.getUserAccount();
      if (acc?.planStartedAt) return acc.planStartedAt;
    }
    return null;
  });

  const [queuedPlan, setQueuedPlan] = useState<QueuedPlan | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('auraprompt_queued_plan');
        if (saved) return JSON.parse(saved);
      } catch {}
      const acc = StorageService.getUserAccount();
      if (acc?.queuedPlan) return acc.queuedPlan;
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
        return acc.toolCredits !== undefined ? acc.toolCredits : 5;
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
    let current = toolCredits;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auraprompt_tool_credits');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) current = Math.min(current, parsed);
      }
    }
    if (current < amount) {
      return false;
    }
    const next = Math.max(0, current - amount);
    setToolCreditsState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_tool_credits', next.toString());
    }
    setUserAccount((prev) => (prev ? { ...prev, toolCredits: next } : prev));
    if (acc && acc.id) {
      void UserSyncService.pushUserData(acc.id, acc.email, { toolCredits: next });
    }
    return true;
  }, [userAccount, toolCredits, openAuthModal]);

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
  // First-Time 5 Credits Signup Bonus Modal: Only displayed once strictly after new account registration!
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState<boolean>(false);
  const [lockedPromptContext, setLockedPromptContext] = useState<PromptPost | null>(null);

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
          if (!isNaN(parsed)) currentCredits = Math.min(toolCredits, parsed);
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
      setUserAccount((prev) => (prev ? { ...prev, toolCredits: nextCredits } : prev));

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

  const upgradePlan = useCallback((tier: 'starter' | 'pro' | 'vip' | 'ultra', serverData?: any, isQueued?: boolean, cycle?: 'monthly' | 'yearly') => {
    const resolvedCycle: BillingCycle = cycle || serverData?.billingCycle || (
      serverData?.planExpiresAt && serverData?.planStartedAt &&
      (new Date(serverData.planExpiresAt).getTime() - new Date(serverData.planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000
        ? 'yearly'
        : 'monthly'
    );
    const planFeatures = getPlanFeaturesForCycle(tier, resolvedCycle);

    // 1. If this upgrade is queued because the user already has an active plan:
    if (isQueued || serverData?.isQueued || serverData?.queuedPlan) {
      const qp = serverData?.queuedPlan;
      if (qp) {
        setQueuedPlan(qp);
        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_queued_plan', JSON.stringify(qp));
        }
      }
      showToast(
        serverData?.message ||
        `Your ${planFeatures.name}${resolvedCycle === 'yearly' ? ' (Yearly)' : ''} plan is queued and will start automatically after your current plan expires at 11:59 PM!`
      );
      return;
    }

    // 2. Active plan activation
    setIsProUserState(true);
    setPlanTierState(tier);
    const allocatedAiSearch = serverData?.aiSearchRemaining ?? (planFeatures.unlimitedSearches ? 999999 : planFeatures.aiSearchQuota);
    setAiSearchRemainingState(allocatedAiSearch);

    const addedCredits = planFeatures.credits;
    const addedRequests = planFeatures.promptRequests;
    const addedPoints = tier === 'starter' ? 10 : tier === 'pro' ? 20 : tier === 'vip' ? 50 : 100;
    const finalPointsBonus = resolvedCycle === 'yearly' ? addedPoints * 5 : addedPoints;

    // Fresh plan initialization: grant plan quotas (Rule 2: unused credits never expire or overwrite)
    const currentCredits = toolCredits || userAccount?.toolCredits || 0;
    const finalCredits = serverData?.toolCredits ?? (currentCredits + addedCredits);
    setToolCreditsState(finalCredits);

    const finalRequests = serverData?.promptRequestsRemaining ?? addedRequests;
    setPromptRequestsRemainingState(finalRequests);

    const finalSavesLimit = serverData?.savesLimit ?? planFeatures.savesLimit;

    let nextPoints = (userAccount?.points || 0) + finalPointsBonus;

    // Calculate dates guaranteeing 11:59:59 PM expiration
    const calculated = calculatePlanDates(serverData?.planStartedAt || new Date(), planFeatures.durationDays);
    const planStartedAt = serverData?.planStartedAt || calculated.planStartedAt;
    const planExpiresAt = serverData?.planExpiresAt || calculated.planExpiresAt;
    setPlanStartedAtState(planStartedAt);
    setPlanExpiresAtState(planExpiresAt);
    setQueuedPlan(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auraprompt_queued_plan');
    }

    setUserAccount((prev) => {
      const fallbackEmail = serverData?.email || '';
      const fallbackName = serverData?.name || fallbackEmail.split('@')[0] || 'Member';
      const base: UserAccount = prev || StorageService.getUserAccount() || {
        id: serverData?.userId || `user_${Date.now()}`,
        name: fallbackName,
        username: '@' + fallbackName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        email: fallbackEmail,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        isLoggedIn: true,
        points: 0,
        requestsMade: 0,
        likesCountForPoints: 0,
        savesCountForPoints: 0,
        generationsCountForPoints: 0,
        sharesCountForPoints: 0,
        referralsCountForPoints: 0,
      };
      const updated: UserAccount = {
        ...base,
        isLoggedIn: true,
        points: (base.points || 0) + finalPointsBonus,
        planTier: tier,
        isProUser: true,
        isPremium: true,
        membershipPlan: tier === 'ultra' ? 'vip' : tier,
        billingCycle: resolvedCycle,
        savesLimit: finalSavesLimit,
        toolCredits: finalCredits,
        planStartedAt,
        planExpiresAt,
        queuedPlan: null,
      };
      StorageService.saveUserAccount(updated);
      return updated;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_pro_member', 'true');
      localStorage.setItem('auraprompt_plan_tier', tier);
      localStorage.setItem('auraprompt_billing_cycle', resolvedCycle);
      localStorage.setItem('auraprompt_saves_limit', String(finalSavesLimit));
      localStorage.setItem('auraprompt_tool_credits', finalCredits.toString());
      localStorage.setItem('auraprompt_prompt_requests', finalRequests.toString());
      localStorage.setItem('auraprompt_ai_search_remaining', allocatedAiSearch.toString());
      localStorage.setItem('auraprompt_plan_started_at', planStartedAt);
      localStorage.setItem('auraprompt_plan_expires_at', planExpiresAt);
    }

    // Persist SaaS Plan upgrade immediately to Supabase cloud
    const currentAcc = userAccount || StorageService.getUserAccount();
    if (currentAcc && (currentAcc.email || currentAcc.id)) {
      void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, {
        planTier: tier,
        isProUser: true,
        billingCycle: resolvedCycle,
        savesLimit: finalSavesLimit,
        toolCredits: finalCredits,
        promptRequestsRemaining: finalRequests,
        aiSearchRemaining: allocatedAiSearch,
        points: nextPoints,
        planStartedAt,
        planExpiresAt,
        queuedPlan: null,
      });
    }

    const cycleBadge = resolvedCycle === 'yearly' ? ' (Yearly)' : '';
    showToast(`Welcome to ${planFeatures.name}${cycleBadge}! Valid until ${formatExpiryDateWithHour(planExpiresAt)}.`);
  }, [userAccount, showToast]);

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

  const refreshPromptRequests = async (_userEmail?: string) => {
    // Feature completely removed
    setPromptRequests([]);
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

  const loginUser = async (email: string, _pass: string, username?: string, avatar?: string, userId?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    let localCr: number | null = null;
    if (typeof window !== 'undefined') {
      const savedCr = localStorage.getItem('auraprompt_tool_credits');
      if (savedCr !== null) {
        const parsed = parseInt(savedCr, 10);
        if (!isNaN(parsed)) localCr = parsed;
      }
    }

    const account: UserAccount = {
      id: userId || ('u_' + cleanEmail.replace(/[^a-z0-9_]/g, '_')),
      name: username || cleanEmail.split('@')[0],
      username: username ? ('@' + username.replace(/[^a-z0-9]/g, '')) : ('@' + cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')),
      email: cleanEmail,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isLoggedIn: true,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      points: 10,
      toolCredits: localCr !== null ? localCr : 5,
      requestsMade: 0,
      likesCountForPoints: 0,
      savesCountForPoints: 0,
      generationsCountForPoints: 0,
      sharesCountForPoints: 0,
      referralsCountForPoints: 0,
    };

    StorageService.saveUserAccount(account);
    setUserAccount(account);

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

      const resolvedTier = synced.planTier || 'free';
      setPlanTierState(resolvedTier);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_plan_tier', resolvedTier);
      }

      setIsProUserState(synced.isProUser || false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_pro_member', String(synced.isProUser || false));
      }

      const isYearly = Boolean(
        (synced as any).billingCycle === 'yearly' ||
        (synced.planExpiresAt && synced.planStartedAt && (new Date(synced.planExpiresAt).getTime() - new Date(synced.planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
      );
      const cycleCfg = getPlanFeaturesForCycle(resolvedTier, isYearly ? 'yearly' : 'monthly');

      let resolvedCredits: number;
      if (synced.toolCredits !== undefined && synced.toolCredits !== null) {
        resolvedCredits = Number(synced.toolCredits);
      } else if (localCr !== null) {
        resolvedCredits = localCr;
      } else {
        resolvedCredits = resolvedTier === 'free' ? 5 : (cycleCfg.credits || 5);
      }

      // Consumed credits must strictly remain intact and never reset back to 5

      setToolCreditsState(resolvedCredits);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', String(resolvedCredits));
      }

      const resolvedRequests = synced.promptRequestsRemaining !== undefined
        ? synced.promptRequestsRemaining
        : (resolvedTier === 'free' ? 0 : cycleCfg.promptRequests || 0);
      setPromptRequestsRemainingState(resolvedRequests);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_prompt_requests', String(resolvedRequests));
      }

      const isPaidTier = resolvedTier !== 'free' || synced.isProUser === true;
      const targetQuota = cycleCfg.unlimitedSearches ? 999999 : (cycleCfg.aiSearchQuota || 5);
      let resolvedSearches: number;
      if (isPaidTier) {
        const rawSearches = synced.aiSearchRemaining !== undefined ? Number(synced.aiSearchRemaining) : targetQuota;
        // Auto-heal: If an active paid plan had searches erroneously clamped to <= 10, restore to full plan quota!
        resolvedSearches = (!isNaN(rawSearches) && rawSearches > 10) ? Math.min(rawSearches, targetQuota) : targetQuota;
      } else {
        resolvedSearches = synced.aiSearchRemaining !== undefined ? Math.min(Number(synced.aiSearchRemaining), 5) : 5;
      }
      setAiSearchRemainingState(resolvedSearches);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_ai_search_remaining', String(resolvedSearches));
      }

      setUnlockedPromptIds(synced.unlockedPromptIds || []);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds || []));
        localStorage.setItem('auraprompt_first_login_claimed', 'true');
        localStorage.setItem('auraprompt_signup_bonus_claimed', 'true');
        localStorage.setItem(`auraprompt_signup_bonus_claimed_${cleanEmail}`, 'true');
        localStorage.setItem(`auraprompt_signup_modal_shown_${cleanEmail}`, 'true');
        const finalStarted = synced.planStartedAt || localStorage.getItem('auraprompt_plan_started_at');
        if (finalStarted) {
          localStorage.setItem('auraprompt_plan_started_at', finalStarted);
          setPlanStartedAtState(finalStarted);
        }
        const finalExpires = synced.planExpiresAt || localStorage.getItem('auraprompt_plan_expires_at');
        if (finalExpires) {
          localStorage.setItem('auraprompt_plan_expires_at', finalExpires);
          setPlanExpiresAtState(finalExpires);
        }
        if (synced.queuedPlan !== undefined) {
          setQueuedPlan(synced.queuedPlan);
          if (synced.queuedPlan) {
            localStorage.setItem('auraprompt_queued_plan', JSON.stringify(synced.queuedPlan));
          } else {
            localStorage.removeItem('auraprompt_queued_plan');
          }
        }
      }
    } catch (e) {
      console.warn('Login reconciliation sync error:', e);
    }

    return true;
  };

  const signupUser = async (name: string, username: string, email: string, _pass: string, avatar?: string, userId?: string): Promise<UserAccount> => {
    const cleanEmail = email.trim().toLowerCase();

    const account: UserAccount = {
      id: userId || ('u_' + cleanEmail.replace(/[^a-z0-9_]/g, '_')),
      name: name || cleanEmail.split('@')[0],
      username: username ? ('@' + username.replace(/[^a-z0-9]/g, '')) : ('@' + cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')),
      email: cleanEmail,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isLoggedIn: true,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      points: 10,
      toolCredits: 5,
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
      const resolvedTier = synced.planTier || 'free';
      setPlanTierState(resolvedTier);
      setIsProUserState(synced.isProUser || false);
      const resolvedCredits = (synced.toolCredits !== undefined && Number(synced.toolCredits) > 0) ? Number(synced.toolCredits) : 5;
      setToolCreditsState(resolvedCredits);

      const resolvedRequests = synced.promptRequestsRemaining !== undefined
        ? synced.promptRequestsRemaining
        : (PLAN_CONFIGS[resolvedTier]?.promptRequests || 0);
      setPromptRequestsRemainingState(resolvedRequests);

      const isPaidTierAcc = resolvedTier !== 'free' || synced.isProUser === true;
      const targetQuotaAcc = PLAN_CONFIGS[resolvedTier]?.unlimitedSearches ? 999999 : (PLAN_CONFIGS[resolvedTier]?.aiSearchQuota || 100);
      let resolvedSearches: number;
      if (isPaidTierAcc) {
        const raw = synced.aiSearchRemaining !== undefined ? Number(synced.aiSearchRemaining) : targetQuotaAcc;
        resolvedSearches = (!isNaN(raw) && raw > 10) ? Math.min(raw, targetQuotaAcc) : targetQuotaAcc;
      } else {
        resolvedSearches = synced.aiSearchRemaining !== undefined ? Math.min(Number(synced.aiSearchRemaining), 5) : 5;
      }
      setAiSearchRemainingState(resolvedSearches);

      setUnlockedPromptIds(synced.unlockedPromptIds || []);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_plan_tier', resolvedTier);
        localStorage.setItem('auraprompt_pro_member', String(synced.isProUser || false));
        localStorage.setItem('auraprompt_tool_credits', String(resolvedCredits));
        localStorage.setItem('auraprompt_prompt_requests', String(resolvedRequests));
        localStorage.setItem('auraprompt_ai_search_remaining', String(resolvedSearches));
        localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds || []));
        localStorage.setItem('auraprompt_first_login_claimed', 'true');
        localStorage.setItem('auraprompt_signup_bonus_claimed', 'true');
        localStorage.setItem(`auraprompt_signup_bonus_claimed_${cleanEmail}`, 'true');
        localStorage.setItem(`auraprompt_signup_modal_shown_${cleanEmail}`, 'true');
      }

      // Record in cloud that signup credits were awarded so they are never granted again
      void UserSyncService.pushUserData(account.id, account.email, {
        toolCredits: resolvedCredits,
        signupCreditsAwarded: true,
        signupBonusClaimed: true,
      });
    } catch (e) {
      console.warn('Signup reconciliation sync error:', e);
    }

    return account;
  };

  const logoutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
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
    setIsAiSearchEnabledState(false);
    setAiSearchResults(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_ai_search_enabled', 'false');
    }

    showToast('Signed out successfully. Session cache cleared.');
  };

  const saveAiHistoryItem = (item: AIHistoryItem) => {
    if (!userAccount || !userAccount.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to save AI prompts to your history.');
      return;
    }

    const isAlreadySaved = aiHistory.some(h => h.id === item.id);
    const isYearly = Boolean(
      userAccount?.billingCycle === 'yearly' ||
      (typeof window !== 'undefined' && localStorage.getItem('auraprompt_billing_cycle') === 'yearly') ||
      (planExpiresAt && planStartedAt && (new Date(planExpiresAt).getTime() - new Date(planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
    );
    const planCfg = getPlanFeaturesForCycle(planTier, isYearly ? 'yearly' : 'monthly');
    const maxSaves = userAccount?.savesLimit || planCfg.savesLimit;
    const isUnlimited = planCfg.unlimitedSaves || maxSaves >= 999999;
    if (!isAlreadySaved && !isUnlimited && (bookmarkedIds.length + aiHistory.length >= maxSaves)) {
      showToast(`${planCfg.name}${isYearly ? ' (Yearly)' : ''} plan limit reached: ${maxSaves} combined saves max (bookmarks + history). Upgrade your plan to increase your limit!`);
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
        const cr = Number(synced.toolCredits);
        setToolCreditsState(cr);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_tool_credits', String(cr));
      }
      if (synced.unlockedPromptIds) {
        setUnlockedPromptIds(synced.unlockedPromptIds);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_unlocked_prompts', JSON.stringify(synced.unlockedPromptIds));
      }
      if (synced.promptRequestsRemaining !== undefined) {
        setPromptRequestsRemainingState(synced.promptRequestsRemaining);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_prompt_requests', String(synced.promptRequestsRemaining));
      }
      if (synced.aiSearchRemaining !== undefined) {
        setAiSearchRemainingState(synced.aiSearchRemaining);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_ai_search_remaining', String(synced.aiSearchRemaining));
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

        // Bookmarks: Merge uniquely with local bookmarks so nothing is ever lost
        const localBookmarks = StorageService.getBookmarkedIds();
        const mergedBookmarks = Array.from(new Set([...localBookmarks, ...(synced.bookmarkedIds || [])]));
        setBookmarkedIds(mergedBookmarks);
        StorageService.setBookmarkedIds(mergedBookmarks);

        // Likes: Merge uniquely
        const localLikes = StorageService.getLikedIds();
        const mergedLikes = Array.from(new Set([...localLikes, ...(synced.likedIds || [])]));
        setLikedIds(mergedLikes);
        StorageService.setLikedIds(mergedLikes);

        if (synced.tasteProfile) {
          setTasteProfile(synced.tasteProfile);
          PersonalizationEngine.saveProfile(synced.tasteProfile);
        }

        // AI History: Merge uniquely by ID
        const localHistory = StorageService.getAiHistory(currentAcc.id);
        const historyMap = new Map<string, AIHistoryItem>();
        localHistory.forEach((it) => { if (it?.id) historyMap.set(it.id, it); });
        (synced.aiHistory || []).forEach((it) => { if (it?.id) historyMap.set(it.id, it); });
        const mergedHistory = Array.from(historyMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 100);
        setAiHistory(mergedHistory);
        StorageService.setAiHistory(mergedHistory);

        // Unlocked Prompts: Merge uniquely
        const localUnlocked = StorageService.getUnlockedPromptIds();
        const mergedUnlocked = Array.from(new Set([...localUnlocked, ...(synced.unlockedPromptIds || [])]));
        setUnlockedPromptIds(mergedUnlocked);
        StorageService.setUnlockedPromptIds(mergedUnlocked);

        // Strict Plan Tier Resolution:
        // A paid plan must NEVER be converted to free tier unless it has explicitly expired!
        const localTier = (localStorage.getItem('auraprompt_plan_tier') as PlanTier) || currentAcc.planTier || 'free';
        const localExpires = localStorage.getItem('auraprompt_plan_expires_at') || currentAcc.planExpiresAt;
        const isLocalActive = ['starter', 'pro', 'vip', 'ultra'].includes(localTier) && (!localExpires || new Date(localExpires).getTime() > Date.now());

        const syncedTier = (synced.planTier && ['starter', 'pro', 'vip', 'ultra'].includes(synced.planTier)) ? synced.planTier : 'free';
        const isSyncedActive = syncedTier !== 'free' && (!synced.planExpiresAt || new Date(synced.planExpiresAt).getTime() > Date.now());

        const TIER_RANK: Record<PlanTier, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };
        let finalTier: PlanTier = 'free';
        if (isSyncedActive && isLocalActive) {
          finalTier = (TIER_RANK[syncedTier] >= TIER_RANK[localTier]) ? syncedTier : localTier;
        } else if (isSyncedActive) {
          finalTier = syncedTier;
        } else if (isLocalActive) {
          finalTier = localTier;
        }

        let isPro = finalTier !== 'free' || Boolean(synced.isProUser || currentAcc.isProUser);
        setPlanTierState(finalTier);
        setIsProUserState(isPro);
        localStorage.setItem('auraprompt_plan_tier', finalTier);
        localStorage.setItem('auraprompt_pro_member', String(isPro));

        const finalExpires = synced.planExpiresAt || localExpires;
        if (finalExpires) {
          localStorage.setItem('auraprompt_plan_expires_at', finalExpires);
          setPlanExpiresAtState(finalExpires);
        }

        const finalStarted = synced.planStartedAt || localStorage.getItem('auraprompt_plan_started_at') || currentAcc.planStartedAt;
        if (finalStarted) {
          localStorage.setItem('auraprompt_plan_started_at', finalStarted);
          setPlanStartedAtState(finalStarted);
        }

        // Queued Plan handling
        if (synced.queuedPlan !== undefined) {
          setQueuedPlan(synced.queuedPlan);
          if (synced.queuedPlan) {
            localStorage.setItem('auraprompt_queued_plan', JSON.stringify(synced.queuedPlan));
          } else {
            localStorage.removeItem('auraprompt_queued_plan');
          }
        }

        // If plan expired, check for queued plan auto-promotion or demote to free tier safely
        const isExpiredNow = Boolean(finalExpires && new Date(finalExpires).getTime() <= Date.now());
        const queuedToPromote = synced.queuedPlan || queuedPlan;
        
        let resolvedCredits = synced.toolCredits !== undefined ? Number(synced.toolCredits) : Number(localStorage.getItem('auraprompt_tool_credits') || 5);
        let resolvedReqs = synced.promptRequestsRemaining !== undefined ? Number(synced.promptRequestsRemaining) : 0;
        let resolvedAiSearchCount = synced.aiSearchRemaining !== undefined ? Number(synced.aiSearchRemaining) : (finalTier !== 'free' ? 200 : 5);
        let resolvedSavesLimitCount = 10;

        if (isExpiredNow) {
          if (queuedToPromote) {
            // Automatically promote queued plan
            finalTier = queuedToPromote.planTier;
            isPro = true;
            setPlanTierState(finalTier);
            setIsProUserState(true);
            localStorage.setItem('auraprompt_plan_tier', finalTier);
            localStorage.setItem('auraprompt_pro_member', 'true');
            setQueuedPlan(null);
            localStorage.removeItem('auraprompt_queued_plan');

            const qpCfg = getPlanFeaturesForCycle(queuedToPromote.planTier, queuedToPromote.billingCycle || 'monthly');
            resolvedCredits = (Number(resolvedCredits) || 0) + (queuedToPromote.credits || qpCfg.credits);
            resolvedReqs = queuedToPromote.promptRequests || qpCfg.promptRequests;
            resolvedAiSearchCount = qpCfg.unlimitedSearches ? 999999 : (queuedToPromote.aiSearchQuota || qpCfg.aiSearchQuota);
            resolvedSavesLimitCount = qpCfg.savesLimit;
          } else {
            // Demote to free tier without loss of any data (Rule 4 & 7)
            finalTier = 'free';
            isPro = false;
            setPlanTierState('free');
            setIsProUserState(false);
            localStorage.setItem('auraprompt_plan_tier', 'free');
            localStorage.setItem('auraprompt_pro_member', 'false');
            resolvedReqs = 0; // Rule 7: prompt request 0 ho jayegi
            resolvedAiSearchCount = 5; // Rule 7: ai searches 5/5 per set ho jayegi
            resolvedSavesLimitCount = 10; // Rule 7: saves limit free tier ke 10 saves tak reset ho jayegi
            // resolvedCredits stays intact!
          }
        } else if (finalTier !== 'free') {
          const planCfg = getPlanFeaturesForCycle(finalTier, (synced.billingCycle as any) || 'monthly');
          resolvedSavesLimitCount = synced.savesLimit || planCfg.savesLimit;
          const userSubmittedCount = Array.isArray(synced.promptRequests) ? synced.promptRequests.length : 0;
          if (resolvedReqs <= 0 && userSubmittedCount < planCfg.promptRequests) {
            resolvedReqs = Math.max(0, planCfg.promptRequests - userSubmittedCount);
          }
          // Auto-heal: If an active paid account has <= 10 AI searches remaining (from earlier clamp bug), restore to full plan quota!
          const targetQuota = planCfg.unlimitedSearches ? 999999 : planCfg.aiSearchQuota;
          if (resolvedAiSearchCount <= 10) {
            resolvedAiSearchCount = targetQuota;
          } else {
            resolvedAiSearchCount = Math.min(resolvedAiSearchCount, targetQuota);
          }
        } else {
          resolvedReqs = 0;
          resolvedAiSearchCount = Math.min(resolvedAiSearchCount, 5);
        }

        // Tool credits: respect exact consumed balance (Rule 2: unused credits never expire or overwrite)
        setToolCreditsState(resolvedCredits);
        localStorage.setItem('auraprompt_tool_credits', String(resolvedCredits));

        setPromptRequestsRemainingState(resolvedReqs);
        localStorage.setItem('auraprompt_prompt_requests', String(resolvedReqs));

        setAiSearchRemainingState(resolvedAiSearchCount);
        localStorage.setItem('auraprompt_ai_search_remaining', String(resolvedAiSearchCount));

        localStorage.setItem('auraprompt_saves_limit', String(resolvedSavesLimitCount));

        setUserAccount((prev) => {
          if (!prev) return prev;
          const updated: UserAccount = {
            ...prev,
            points: synced.points ?? prev.points,
            name: synced.name || prev.name,
            avatar: synced.avatar || prev.avatar,
            planTier: finalTier,
            isProUser: isPro,
            toolCredits: resolvedCredits,
            planExpiresAt: finalExpires || prev.planExpiresAt,
            planStartedAt: finalStarted || prev.planStartedAt,
            queuedPlan: synced.queuedPlan || prev.queuedPlan || null,
          };
          StorageService.saveUserAccount(updated);
          return updated;
        });
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

  // Active Plan Expiration Monitor (Rule 4, 5, 7): Checks every 30 seconds
  useEffect(() => {
    const checkExpiration = () => {
      if (planTier !== 'free' && planExpiresAt) {
        const expTime = new Date(planExpiresAt).getTime();
        if (!isNaN(expTime) && expTime <= Date.now()) {
          // If queued plan exists, promote it!
          if (queuedPlan) {
            const qp = queuedPlan;
            const qpCfg = getPlanFeaturesForCycle(qp.planTier, qp.billingCycle || 'monthly');
            const newStart = qp.scheduledStartAt || new Date().toISOString();
            const newExpires = qp.scheduledExpiresAt || calculatePlanDates(newStart, qpCfg.durationDays).planExpiresAt;
            const newCredits = (toolCredits || 0) + (qp.credits || qpCfg.credits);
            const newRequests = qp.promptRequests || qpCfg.promptRequests;
            const newAiSearches = qpCfg.unlimitedSearches ? 999999 : (qp.aiSearchQuota || qpCfg.aiSearchQuota);

            setPlanTierState(qp.planTier);
            setIsProUserState(true);
            setPlanStartedAtState(newStart);
            setPlanExpiresAtState(newExpires);
            setToolCreditsState(newCredits);
            setPromptRequestsRemainingState(newRequests);
            setAiSearchRemainingState(newAiSearches);
            setQueuedPlan(null);

            if (typeof window !== 'undefined') {
              localStorage.setItem('auraprompt_plan_tier', qp.planTier);
              localStorage.setItem('auraprompt_pro_member', 'true');
              localStorage.setItem('auraprompt_plan_started_at', newStart);
              localStorage.setItem('auraprompt_plan_expires_at', newExpires);
              localStorage.setItem('auraprompt_tool_credits', String(newCredits));
              localStorage.setItem('auraprompt_prompt_requests', String(newRequests));
              localStorage.setItem('auraprompt_ai_search_remaining', String(newAiSearches));
              localStorage.setItem('auraprompt_saves_limit', String(qpCfg.savesLimit));
              localStorage.removeItem('auraprompt_queued_plan');
            }

            const currentAcc = userAccount || StorageService.getUserAccount();
            if (currentAcc && (currentAcc.email || currentAcc.id)) {
              void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, {
                planTier: qp.planTier,
                isProUser: true,
                planStartedAt: newStart,
                planExpiresAt: newExpires,
                toolCredits: newCredits,
                promptRequestsRemaining: newRequests,
                aiSearchRemaining: newAiSearches,
                savesLimit: qpCfg.savesLimit,
                queuedPlan: null,
              });
            }
            showToast(`Your queued ${qpCfg.name} plan is now active!`);
          } else {
            // Demote to free tier without loss of data (Rule 4, 7)
            setPlanTierState('free');
            setIsProUserState(false);
            setPromptRequestsRemainingState(0);
            setAiSearchRemainingState(5);

            if (typeof window !== 'undefined') {
              localStorage.setItem('auraprompt_plan_tier', 'free');
              localStorage.setItem('auraprompt_pro_member', 'false');
              localStorage.setItem('auraprompt_prompt_requests', '0');
              localStorage.setItem('auraprompt_ai_search_remaining', '5');
              localStorage.setItem('auraprompt_saves_limit', '10');
            }

            const currentAcc = userAccount || StorageService.getUserAccount();
            if (currentAcc && (currentAcc.email || currentAcc.id)) {
              void UserSyncService.pushUserData(currentAcc.id, currentAcc.email, {
                planTier: 'free',
                isProUser: false,
                promptRequestsRemaining: 0,
                aiSearchRemaining: 5,
                savesLimit: 10,
              });
            }
            showToast('Your subscription plan has expired. You are now on the Free tier. Your saved data, history, unlocked prompts, and remaining credits are completely safe!');
          }
        }
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 30000);
    return () => clearInterval(interval);
  }, [planTier, planExpiresAt, queuedPlan, toolCredits, userAccount, showToast]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [popularSearchQueries, setPopularSearchQueries] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTime = localStorage.getItem('auraprompt_popular_queries_time');
        const savedQueries = localStorage.getItem('auraprompt_popular_queries');
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (savedTime && savedQueries && now - parseInt(savedTime, 10) < THREE_DAYS) {
          const parsed = JSON.parse(savedQueries);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    const realQueries: string[] = [];
    const sourcePosts = INITIAL_POSTS || [];
    sourcePosts.forEach((p) => {
      if (p.title) realQueries.push(p.title);
      if (Array.isArray(p.tags)) p.tags.forEach((t) => realQueries.push(t));
      if (p.category) realQueries.push(p.category);
    });
    const uniqueReal = Array.from(new Set(realQueries)).slice(0, 8);
    if (typeof window !== 'undefined' && uniqueReal.length > 0) {
      try {
        localStorage.setItem('auraprompt_popular_queries', JSON.stringify(uniqueReal));
        localStorage.setItem('auraprompt_popular_queries_time', String(Date.now()));
      } catch {}
    }
    return uniqueReal.length > 0 ? uniqueReal : ['Portrait photography', 'Cinematic lighting', 'Cyberpunk portrait', 'Vintage film'];
  });
  const [selectedCategory, setSelectedCategoryState] = useState<string>('');

  const setSelectedCategory = (cat: string) => {
    const clean = cat === 'all' || cat === 'none' ? '' : cat;
    setSelectedCategoryState(clean);
  };
  const [selectedTool, setSelectedTool] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<
    'trending' | 'most-popular' | 'most-liked' | 'most-copied' | 'newest'
  >('trending');

  // Gemini AI Search State & Cache
  const [aiSearchResults, setAiSearchResults] = useState<AiSearchResult | null>(null);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const aiSearchCacheRef = useRef<Map<string, AiSearchResult>>(new Map());

  const [isAiSearchEnabled, setIsAiSearchEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const acc = StorageService.getUserAccount();
      if (!acc || !acc.isLoggedIn) return false;
      const saved = localStorage.getItem('auraprompt_ai_search_enabled');
      if (saved !== null) return saved === 'true';
      return true;
    }
    return false;
  });

  const setIsAiSearchEnabled = useCallback((enabled: boolean) => {
    setIsAiSearchEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraprompt_ai_search_enabled', String(enabled));
    }
  }, []);

  const [aiSearchRemaining, setAiSearchRemainingState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedTier = localStorage.getItem('auraprompt_plan_tier') as PlanTier;
      const acc = StorageService.getUserAccount();
      const isProMember = localStorage.getItem('auraprompt_pro_member') === 'true' || acc?.isProUser === true;
      const effectiveTier: PlanTier = (savedTier && ['starter', 'pro', 'vip', 'ultra'].includes(savedTier))
        ? savedTier
        : (acc?.planTier && ['starter', 'pro', 'vip', 'ultra'].includes(acc.planTier))
          ? acc.planTier
          : (isProMember ? 'pro' : 'free');

      const planCfg = PLAN_CONFIGS[effectiveTier] || PLAN_CONFIGS.free;
      if (planCfg.unlimitedSearches) return 999999;

      const saved = localStorage.getItem('auraprompt_ai_search_remaining');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          // If on a paid plan and parsed is <= 10 (clamped by earlier bug), auto-heal to full plan quota!
          if (effectiveTier !== 'free') {
            if (parsed <= 10) return planCfg.aiSearchQuota;
            return Math.min(parsed, planCfg.aiSearchQuota);
          }
          return Math.min(parsed, 5);
        }
      }
      return effectiveTier !== 'free' ? planCfg.aiSearchQuota : 5;
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
  const aiSearchRemainingRef = useRef<number>(aiSearchRemaining);
  useEffect(() => {
    aiSearchRemainingRef.current = aiSearchRemaining;
  }, [aiSearchRemaining]);

  const performAiSearch = useCallback(async (query: string, deductQuota: boolean = false): Promise<AiSearchResult | null> => {
    // STRICT REQUIREMENT: Only logged-in users are permitted to access and run AI search
    const acc = userAccount || (typeof window !== 'undefined' ? StorageService.getUserAccount() : null);
    if (!acc || !acc.isLoggedIn) {
      setAiSearchResults(null);
      setIsAiSearching(false);
      return null;
    }

    const clean = query.trim();
    if (!clean || clean.length < 2 || !isAiSearchEnabled) {
      setAiSearchResults(null);
      setIsAiSearching(false);
      return null;
    }

    const planCfg = PLAN_CONFIGS[planTier] || PLAN_CONFIGS.free;
    const currentRemaining = aiSearchRemainingRef.current;

    if (!planCfg.unlimitedSearches && currentRemaining <= 0) {
      showToast(`You have used all of your AI search quota (${planCfg.aiSearchQuota} searches). Please upgrade your plan to unlock more searches!`);
      setIsProCheckoutModalOpen(true);
      setIsAiSearchEnabled(false);
      setAiSearchResults(null);
      setIsAiSearching(false);
      return null;
    }

    const cacheKey = clean.toLowerCase();

    let shouldDeduct = false;
    if (!planCfg.unlimitedSearches && deductQuota) {
      if (!aiSearchDeductedRef.current.has(cacheKey)) {
        aiSearchDeductedRef.current.add(cacheKey);
        shouldDeduct = true;
      }
    }

    // Helper to safely deduct exactly 1 search point on completed search
    const deductOnePoint = () => {
      if (shouldDeduct) {
        setAiSearchRemainingState((prev) => {
          const next = Math.max(0, prev - 1);
          aiSearchRemainingRef.current = next;
          if (typeof window !== 'undefined') {
            localStorage.setItem('auraprompt_ai_search_remaining', next.toString());
          }
          if (acc && acc.id && acc.isLoggedIn) {
            void UserSyncService.pushUserData(acc.id, acc.email, {
              aiSearchRemaining: next,
            });
          }
          if (next === 0) {
            setIsAiSearchEnabledState(false);
            if (typeof window !== 'undefined') {
              localStorage.setItem('auraprompt_ai_search_enabled', 'false');
            }
          }
          return next;
        });
      }
    };

    if (aiSearchCacheRef.current.has(cacheKey)) {
      const cached = aiSearchCacheRef.current.get(cacheKey)!;
      setAiSearchResults(cached);
      deductOnePoint();
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
          deductOnePoint();
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
  }, [isAiSearchEnabled, planTier, showToast, setIsProCheckoutModalOpen, setIsAiSearchEnabled, userAccount]);

  const clearAiSearch = useCallback(() => {
    setAiSearchResults(null);
    setIsAiSearching(false);
  }, []);

  // Whenever searchQuery updates, trigger performAiSearch for live preview without deducting quota
  useEffect(() => {
    const q = searchQuery.trim();
    const acc = userAccount || (typeof window !== 'undefined' ? StorageService.getUserAccount() : null);
    if (!isAiSearchEnabled || !acc || !acc.isLoggedIn || !q || q.length < 2) {
      setAiSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      void performAiSearch(q, false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, isAiSearchEnabled, userAccount, performAiSearch]);

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
      // Fetch posts independently and quickly for fast initial render with cache busting
      const postsUrl = `/api/posts?all=true&_t=${Date.now()}`;
      const fetchPosts = fetch(postsUrl, { cache: 'no-store' })
        .then(async (res) => {
          if (res.ok && !isSavingRef.current) {
            const data = await res.json();
            if (data.success && Array.isArray(data.posts)) {
              let deletedSet = new Set<string>();
              if (typeof window !== 'undefined') {
                try {
                  const rawDel = localStorage.getItem('promptcms_deleted_ids');
                  if (rawDel) {
                    const parsed = JSON.parse(rawDel);
                    if (Array.isArray(parsed)) deletedSet = new Set(parsed);
                  }
                } catch {}
              }
              const cleanList = data.posts.filter((p: PromptPost) => !deletedSet.has(p.id));
              setPosts(cleanList);
              StorageService.saveCachedPosts(cleanList);
            }
          }
        })
        .catch((err) => {
          console.warn('Network sync posts notice (using cache):', err?.message || err);
        })
        .finally(() => setIsLoadingPosts(false));

      const fetchCats = fetch('/api/categories')
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

      const fetchTags = fetch('/api/tags')
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

      const fetchSettings = fetch('/api/settings')
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
      localStorage.removeItem('selectedCategory');
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
        // Visitor / Guest without explicit logged-in session: restore any guest bookmarks, likes, and local active plan
        setUserAccount(null);
        const guestBookmarks = StorageService.getBookmarkedIds();
        if (guestBookmarks && guestBookmarks.length > 0) setBookmarkedIds(guestBookmarks);
        const guestLikes = StorageService.getLikedIds();
        if (guestLikes && guestLikes.length > 0) setLikedIds(guestLikes);

        const localTier = (localStorage.getItem('auraprompt_plan_tier') as PlanTier) || 'free';
        const localExpires = localStorage.getItem('auraprompt_plan_expires_at');
        const isLocalActive = ['starter', 'pro', 'vip', 'ultra'].includes(localTier) && (!localExpires || new Date(localExpires).getTime() > Date.now());
        if (isLocalActive) {
          setPlanTierState(localTier);
          setIsProUserState(true);
        }
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
      if (!synced) return;

      // Bookmarks: strictly merge with existing to avoid data loss
      const localBookmarks = StorageService.getBookmarkedIds();
      const mergedBookmarks = Array.from(new Set([...localBookmarks, ...(synced.bookmarkedIds || [])]));
      setBookmarkedIds(mergedBookmarks);
      StorageService.setBookmarkedIds(mergedBookmarks);

      // Likes: strictly merge
      const localLikes = StorageService.getLikedIds();
      const mergedLikes = Array.from(new Set([...localLikes, ...(synced.likedIds || [])]));
      setLikedIds(mergedLikes);
      StorageService.setLikedIds(mergedLikes);

      if (synced.promptRequests && Array.isArray(synced.promptRequests)) {
        setPromptRequests(synced.promptRequests);
        StorageService.setPromptRequests(synced.promptRequests);
      }
      if (synced.tasteProfile) {
        setTasteProfile(synced.tasteProfile);
        PersonalizationEngine.saveProfile(synced.tasteProfile);
      }

      // AI History: merge uniquely by ID
      const localHist = StorageService.getAiHistory();
      const historyMap = new Map<string, AIHistoryItem>();
      (localHist || []).forEach((it: any) => { if (it?.id) historyMap.set(it.id, it); });
      (synced.aiHistory || []).forEach((it: any) => { if (it?.id) historyMap.set(it.id, it); });
      const mergedHist = Array.from(historyMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 100);
      setAiHistory(mergedHist);
      StorageService.setAiHistory(mergedHist);

      if (synced.points !== undefined) {
        setUserAccount((prev) => (prev ? { ...prev, points: synced.points } : prev));
      }

      // Unlocked Prompts: merge uniquely
      const localUnlocked = StorageService.getUnlockedPromptIds();
      const mergedUnlocked = Array.from(new Set([...localUnlocked, ...(synced.unlockedPromptIds || [])]));
      setUnlockedPromptIds(mergedUnlocked);
      StorageService.setUnlockedPromptIds(mergedUnlocked);

      // Strict Plan Tier Resolution:
      // A paid plan must NEVER be converted to free tier unless it has explicitly expired!
      const validTiers: PlanTier[] = ['starter', 'pro', 'vip', 'ultra', 'free'];
      const acc = StorageService.getUserAccount();
      const rawLocal = typeof window !== 'undefined' ? localStorage.getItem('auraprompt_plan_tier') : null;
      const localTier: PlanTier = (rawLocal && validTiers.includes(rawLocal as PlanTier))
        ? (rawLocal as PlanTier)
        : (acc?.planTier && validTiers.includes(acc.planTier) ? acc.planTier : 'free');
      const localExpires = localStorage.getItem('auraprompt_plan_expires_at') || acc?.planExpiresAt;
      const isLocalActive = ['starter', 'pro', 'vip', 'ultra'].includes(localTier) && (!localExpires || new Date(localExpires).getTime() > Date.now());

      const syncedTier: PlanTier = (synced.planTier && validTiers.includes(synced.planTier)) ? (synced.planTier as PlanTier) : 'free';
      const isSyncedActive = syncedTier !== 'free' && (!synced.planExpiresAt || new Date(synced.planExpiresAt).getTime() > Date.now());

      const TIER_RANK: Record<PlanTier, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };
      let finalTier: PlanTier = 'free';
      if (isSyncedActive && isLocalActive) {
        finalTier = (TIER_RANK[syncedTier] >= TIER_RANK[localTier]) ? syncedTier : localTier;
      } else if (isSyncedActive) {
        finalTier = syncedTier;
      } else if (isLocalActive) {
        finalTier = localTier;
      }

      let isPro = finalTier !== 'free' || Boolean(synced.isProUser || acc?.isProUser);
      setPlanTierState(finalTier);
      setIsProUserState(isPro);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_plan_tier', finalTier);
        localStorage.setItem('auraprompt_pro_member', String(isPro));
      }

      const finalExpires = synced.planExpiresAt || localExpires;
      if (finalExpires) {
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_plan_expires_at', finalExpires);
        setPlanExpiresAtState(finalExpires);
      }

      const finalStarted = synced.planStartedAt || localStorage.getItem('auraprompt_plan_started_at') || acc?.planStartedAt;
      if (finalStarted && typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_plan_started_at', finalStarted);
        setPlanStartedAtState(finalStarted);
      }

      // Queued Plan handling
      if (synced.queuedPlan !== undefined) {
        setQueuedPlan(synced.queuedPlan);
        if (synced.queuedPlan && typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_queued_plan', JSON.stringify(synced.queuedPlan));
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('auraprompt_queued_plan');
        }
      }

      // Check if plan expired but a queued plan exists for auto-promotion
      const isExpiredNow = finalExpires && new Date(finalExpires).getTime() <= Date.now();
      const queuedToPromote = synced.queuedPlan || queuedPlan;
      if (isExpiredNow && queuedToPromote) {
        finalTier = queuedToPromote.planTier;
        isPro = true;
        setPlanTierState(finalTier);
        setIsProUserState(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_plan_tier', finalTier);
          localStorage.setItem('auraprompt_pro_member', 'true');
          localStorage.removeItem('auraprompt_queued_plan');
        }
        setQueuedPlan(null);
      }

      // Tool credits: respect consumed balance
      let resolvedCredits = synced.toolCredits !== undefined ? Number(synced.toolCredits) : Number(localStorage.getItem('auraprompt_tool_credits') || 5);
      setToolCreditsState(resolvedCredits);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auraprompt_tool_credits', String(resolvedCredits));
      }

      if (synced.promptRequestsRemaining !== undefined) {
        let resolvedReqs = Number(synced.promptRequestsRemaining);
        const resolvedTier = synced.planTier || 'free';
        if (resolvedTier !== 'free') {
          const cfg = PLAN_CONFIGS[resolvedTier as PlanTier] || PLAN_CONFIGS.free;
          const userSubmittedCount = Array.isArray(synced.promptRequests) ? synced.promptRequests.length : 0;
          if (resolvedReqs <= 0 && userSubmittedCount < cfg.promptRequests) {
            resolvedReqs = Math.max(0, cfg.promptRequests - userSubmittedCount);
          }
        } else {
          resolvedReqs = 0;
        }
        setPromptRequestsRemainingState(resolvedReqs);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_prompt_requests', String(resolvedReqs));
      }

      if (synced.aiSearchRemaining !== undefined) {
        setAiSearchRemainingState(synced.aiSearchRemaining);
        if (typeof window !== 'undefined') localStorage.setItem('auraprompt_ai_search_remaining', String(synced.aiSearchRemaining));
      }

      setUserAccount((prev) => {
        if (!prev) return prev;
        const updated: UserAccount = {
          ...prev,
          planTier: finalTier,
          isProUser: isPro,
          toolCredits: resolvedCredits,
          planExpiresAt: finalExpires || prev.planExpiresAt,
          planStartedAt: finalStarted || prev.planStartedAt,
          queuedPlan: synced.queuedPlan || prev.queuedPlan || null,
        };
        StorageService.saveUserAccount(updated);
        return updated;
      });
    };

    // Check Firebase Auth Session
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const existing = StorageService.getUserAccount();
        const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Creator';
        const account: UserAccount = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || existing?.name || emailPrefix,
          username: existing?.username || `@${emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          email: firebaseUser.email || existing?.email || '',
          avatar:
            firebaseUser.photoURL ||
            existing?.avatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
          isLoggedIn: true,
          joinedDate: existing?.joinedDate || 'Recently',
          points: existing?.points ?? 10,
          requestsMade: existing?.requestsMade || 0,
          likesCountForPoints: existing?.likesCountForPoints || 0,
          savesCountForPoints: existing?.savesCountForPoints || 0,
          generationsCountForPoints: existing?.generationsCountForPoints || 0,
          sharesCountForPoints: existing?.sharesCountForPoints || 0,
          referralsCountForPoints: existing?.referralsCountForPoints || 0,
          toolCredits: existing?.toolCredits !== undefined ? existing.toolCredits : 5,
        };
        setUserAccount(account);
        StorageService.saveUserAccount(account);

        const synced = await UserSyncService.reconcileOnLogin(account);
        applySynced(synced);
      } else {
        const acc = StorageService.getUserAccount();
        if (acc && acc.isLoggedIn) {
          UserSyncService.reconcileOnLogin(acc).then(applySynced);
        }
      }
    });

    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin === window.location.origin) {
        if (event.data?.type === 'FIREBASE_AUTH_SUCCESS' || event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
          const acc = StorageService.getUserAccount();
          if (acc && acc.isLoggedIn) {
            void UserSyncService.reconcileOnLogin(acc).then(applySynced);
          }
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

    // Unrecord from deleted IDs list if re-saving
    if (typeof window !== 'undefined') {
      try {
        const rawDel = localStorage.getItem('promptcms_deleted_ids');
        if (rawDel) {
          const list: string[] = JSON.parse(rawDel);
          const filtered = list.filter((id) => id !== post.id);
          localStorage.setItem('promptcms_deleted_ids', JSON.stringify(filtered));
        }
      } catch {}
    }

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
        StorageService.saveCachedPosts(data.posts);
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

  const deletePosts = async (ids: string[]): Promise<boolean> => {
    if (!ids || ids.length === 0) return true;
    isSavingRef.current = true;
    const idSet = new Set(ids);

    // Save deleted IDs to localStorage permanently
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('promptcms_deleted_ids');
        const list: string[] = raw ? JSON.parse(raw) : [];
        ids.forEach((id) => {
          if (!list.includes(id)) list.push(id);
        });
        localStorage.setItem('promptcms_deleted_ids', JSON.stringify(list));
      } catch {}
    }

    // 1. Instant optimistic update in memory & local storage
    setPosts((prev) => {
      const updated = prev.filter((p) => !idSet.has(p.id));
      StorageService.saveCachedPosts(updated);
      return updated;
    });

    setBookmarkedIds((prev) => {
      const updated = prev.filter((item) => !idSet.has(item));
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
    });

    showToast(`${ids.length} prompt${ids.length > 1 ? 's' : ''} removed`);

    try {
      const res = await fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        // Guarantee deleted IDs are NEVER reintroduced from server response
        const remaining = data.posts.filter((p: PromptPost) => !idSet.has(p.id));
        setPosts(remaining);
        StorageService.saveCachedPosts(remaining);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete posts on server:', err);
      return false;
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const deletePost = async (id: string): Promise<boolean> => {
    return deletePosts([id]);
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
    // Likes system disabled to avoid unnecessary writes and reads
  };

  const toggleBookmark = (id: string) => {
    const currentAcc = userAccount || StorageService.getUserAccount();
    if (!currentAcc || !currentAcc.isLoggedIn) {
      openAuthModal('Sign in or create a free account to save prompts to your private collection.');
      return;
    }

    const currentBookmarks = StorageService.getBookmarkedIds();
    const isCurrentlyBookmarked = currentBookmarks.includes(id);
    const isYearly = Boolean(
      currentAcc?.billingCycle === 'yearly' ||
      (typeof window !== 'undefined' && localStorage.getItem('auraprompt_billing_cycle') === 'yearly') ||
      (planExpiresAt && planStartedAt && (new Date(planExpiresAt).getTime() - new Date(planStartedAt).getTime()) > 60 * 24 * 60 * 60 * 1000)
    );
    const planCfg = getPlanFeaturesForCycle(planTier, isYearly ? 'yearly' : 'monthly');
    const maxSaves = currentAcc?.savesLimit || planCfg.savesLimit;
    const isUnlimited = planCfg.unlimitedSaves || maxSaves >= 999999;
    if (!isCurrentlyBookmarked && !isUnlimited && (currentBookmarks.length + aiHistory.length >= maxSaves)) {
      showToast(`${planCfg.name}${isYearly ? ' (Yearly)' : ''} plan limit reached: ${maxSaves} combined saves max (bookmarks + history). Upgrade your plan to increase your limit!`);
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
        deletePosts,
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
        queuedPlan,
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

