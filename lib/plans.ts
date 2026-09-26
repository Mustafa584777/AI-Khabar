import { PlanTier } from '@/types/prompt';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  badge?: string | null;
  priceRupees: number;
  amountPaise: number;
  credits: number; // Monthly tool credits added
  aiSearchQuota: number; // Searches per month
  promptRequests: number; // Custom prompt requests per month
  savesLimit: number; // Combined bookmarks + history limit
  unlimitedSaves: boolean;
  unlimitedSearches: boolean;
  unlockAllPrompts: boolean;
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    badge: null,
    priceRupees: 0,
    amountPaise: 0,
    credits: 5,
    aiSearchQuota: 5,
    promptRequests: 0,
    savesLimit: 10,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: false,
    features: [
      '5 free signup tool credits',
      '5 AI conversational searches',
      '10 combined saves & history',
      '1 cr each to unlock premium prompts',
      'Image-to-Prompt extraction: 2 cr each',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    badge: null,
    priceRupees: 1,
    amountPaise: 100,
    credits: 100,
    aiSearchQuota: 100,
    promptRequests: 1,
    savesLimit: 100,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '100 prompt tool credits / mo',
      '100 AI Searches / mo',
      '1 Prompt Request',
      '100 saves & history',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Most Popular',
    priceRupees: 1,
    amountPaise: 100,
    credits: 250,
    aiSearchQuota: 200,
    promptRequests: 2,
    savesLimit: 200,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '250 prompt tool credits / mo',
      '200 AI Searches / mo',
      '2 Prompt Requests',
      '200 saves & history',
    ],
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    badge: 'Best Value',
    priceRupees: 1,
    amountPaise: 100,
    credits: 600,
    aiSearchQuota: 500,
    promptRequests: 3,
    savesLimit: 400,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '600 prompt tool credits / mo',
      '500 AI Searches / mo',
      '3 Prompt Requests',
      '400 saves & history',
    ],
  },
  ultra: {
    id: 'ultra',
    name: 'Studio 499',
    badge: 'Ultimate Studio',
    priceRupees: 1,
    amountPaise: 100,
    credits: 1500,
    aiSearchQuota: 999999,
    promptRequests: 5,
    savesLimit: 999999,
    unlimitedSaves: true,
    unlimitedSearches: true,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '1500 credits / mo',
      'Unlimited AI Search',
      '5 Prompt Requests / mo',
      'Unlimited saves & history',
    ],
  },
};

export function getPlanConfig(tier?: PlanTier | string | null): PlanConfig {
  if (tier && tier in PLAN_CONFIGS) {
    return PLAN_CONFIGS[tier as PlanTier];
  }
  return PLAN_CONFIGS.free;
}
