import { PlanTier } from '@/types/prompt';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  badge?: string | null;
  priceRupees: number;
  amountPaise: number;
  credits: number; // Monthly recurring tool credits added (0 for free)
  initialSignupCredits?: number; // One-time signup credits (5 for free)
  aiSearchQuota: number; // Searches per month
  promptRequests: number; // Custom prompt requests per month
  savesLimit: number; // Combined bookmarks + history limit
  unlimitedSaves: boolean;
  unlimitedSearches: boolean;
  unlockAllPrompts: boolean;
  features: string[];
}

export type BillingCycle = 'monthly' | 'yearly';

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    badge: null,
    priceRupees: 0,
    amountPaise: 0,
    credits: 0, // No recurring free credits! Only 5 one-time credits given on initial signup
    initialSignupCredits: 5,
    aiSearchQuota: 5,
    promptRequests: 0,
    savesLimit: 10,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: false,
    features: [
      '5 one-time free signup tool credits',
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
    priceRupees: 49,
    amountPaise: 4900,
    credits: 100,
    aiSearchQuota: 100,
    promptRequests: 0,
    savesLimit: 100,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '100 prompt tool credits / mo',
      '100 AI Searches / mo',
      '100 saves & history',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Most Popular',
    priceRupees: 99,
    amountPaise: 9900,
    credits: 250,
    aiSearchQuota: 200,
    promptRequests: 0,
    savesLimit: 200,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '250 prompt tool credits / mo',
      '200 AI Searches / mo',
      '200 saves & history',
    ],
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    badge: 'Best Value',
    priceRupees: 199,
    amountPaise: 19900,
    credits: 600,
    aiSearchQuota: 500,
    promptRequests: 0,
    savesLimit: 400,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '600 prompt tool credits / mo',
      '500 AI Searches / mo',
      '400 saves & history',
    ],
  },
  ultra: {
    id: 'ultra',
    name: 'Studio 499',
    badge: 'Ultimate Studio',
    priceRupees: 499,
    amountPaise: 49900,
    credits: 1500,
    aiSearchQuota: 999999,
    promptRequests: 0,
    savesLimit: 999999,
    unlimitedSaves: true,
    unlimitedSearches: true,
    unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '1500 credits / mo',
      'Unlimited AI Search',
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

/**
 * Returns features, quotas, credits, and duration for a given plan and billing cycle.
 * For Yearly subscriptions, all 12 months of credits, searches, prompt requests, and saves
 * are combined and granted immediately upfront in one go.
 */
export function getPlanFeaturesForCycle(
  tier?: PlanTier | string | null,
  cycle: BillingCycle = 'monthly'
): PlanConfig & { durationDays: number; billingCycle: BillingCycle } {
  const base = getPlanConfig(tier);
  const isYearly = cycle === 'yearly' && base.id !== 'free';
  const multiplier = isYearly ? 12 : 1;
  const durationDays = isYearly ? 365 : 30;

  if (base.id === 'free') {
    return {
      ...base,
      durationDays: 36500, // lifetime
      billingCycle: 'monthly',
    };
  }

  return {
    ...base,
    credits: base.credits * multiplier,
    aiSearchQuota: base.unlimitedSearches ? 999999 : base.aiSearchQuota * multiplier,
    promptRequests: base.promptRequests * multiplier,
    savesLimit: base.unlimitedSaves ? 999999 : base.savesLimit * multiplier,
    durationDays,
    billingCycle: cycle,
  };
}

/**
 * Calculates start and end timestamps for a subscription plan.
 * The expiration timestamp is guaranteed to be set to 11:59:59.999 PM of the target day.
 */
export function calculatePlanDates(
  startDateInput?: Date | string | number | null,
  durationDays: number = 30
): { planStartedAt: string; planExpiresAt: string } {
  const start = startDateInput ? new Date(startDateInput) : new Date();
  const safeStart = isNaN(start.getTime()) ? new Date() : start;

  // Add 30 days
  const expires = new Date(safeStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
  // Guarantee expiration at 11:59:59.999 PM
  expires.setHours(23, 59, 59, 999);

  return {
    planStartedAt: safeStart.toISOString(),
    planExpiresAt: expires.toISOString(),
  };
}

/**
 * Calculates dates for a plan scheduled to start immediately after an existing plan ends.
 */
export function calculateQueuedPlanDates(
  activePlanExpiresAt: string | Date,
  durationDays: number = 30
): { scheduledStartAt: string; scheduledExpiresAt: string } {
  const start = new Date(activePlanExpiresAt);
  const safeStart = isNaN(start.getTime()) ? new Date() : start;

  const expires = new Date(safeStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
  expires.setHours(23, 59, 59, 999);

  return {
    scheduledStartAt: safeStart.toISOString(),
    scheduledExpiresAt: expires.toISOString(),
  };
}

/**
 * Formats a date with full day, month, year, and 12-hour time (e.g. 26 Sep 2026 at 04:30 PM).
 */
export function formatPlanDateWithTime(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Active';
  const datePart = d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
}

/**
 * Formats a plan expiration date with explicit 11:59 PM hour display.
 */
export function formatExpiryDateWithHour(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Active';
  const datePart = d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${datePart} (Expires at 11:59 PM)`;
}

