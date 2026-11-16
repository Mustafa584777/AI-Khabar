import { PlanTier } from '@/types/prompt';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  badge?: string | null;
  priceRupees: number;
  amountPaise: number;
  credits: number; // Yearly tool credits granted (0 for free signup base)
  initialSignupCredits?: number; // One-time signup credits (5 for free)
  aiSearchQuota: number; // Daily AI searches
  promptRequests: number;
  savesLimit: number; // Combined bookmarks + history limit
  unlimitedSaves: boolean;
  unlimitedSearches: boolean;
  unlockAllPrompts: boolean;
  features: string[];
}

export type BillingCycle = 'monthly' | 'yearly';

const SINGLE_PRO_YEARLY_CONFIG: Omit<PlanConfig, 'id'> = {
  name: 'Pro Yearly',
  badge: 'All-Access Annual Pass',
  priceRupees: 99,
  amountPaise: 9900,
  credits: 120,
  aiSearchQuota: 3,
  promptRequests: 0,
  savesLimit: 999999,
  unlimitedSaves: true,
  unlimitedSearches: false,
  unlockAllPrompts: true,
    features: [
      'Unlock all premium prompts',
      '120 prompt tool credits',
      'No watermark text on copied prompts',
      'AI Search (3 daily searches)',
      'Unlimited saves & history',
    ],
  };

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    badge: null,
    priceRupees: 0,
    amountPaise: 0,
    credits: 0,
    initialSignupCredits: 5,
    aiSearchQuota: 0,
    promptRequests: 0,
    savesLimit: 10,
    unlimitedSaves: false,
    unlimitedSearches: false,
    unlockAllPrompts: false,
    features: [
      '5 one-time free signup tool credits',
      '10 combined saves & history',
      'Free tier prompt access',
      'Copied prompts include watermark text',
    ],
  },
  // Legacy tier keys alias to the single ₹99/year Pro Yearly benefits for backward DB compatibility
  starter: {
    id: 'starter',
    ...SINGLE_PRO_YEARLY_CONFIG,
  },
  pro: {
    id: 'pro',
    ...SINGLE_PRO_YEARLY_CONFIG,
  },
  vip: {
    id: 'vip',
    ...SINGLE_PRO_YEARLY_CONFIG,
  },
};

export function getPlanConfig(tier?: PlanTier | string | null): PlanConfig {
  if (tier && tier in PLAN_CONFIGS) {
    return PLAN_CONFIGS[tier as PlanTier];
  }
  return PLAN_CONFIGS.free;
}

/**
 * Returns features, quotas, credits, and duration for the active plan.
 * Paid membership is a single annual ₹99/year plan with full benefits and strictly 120 tool credits.
 */
export function getPlanFeaturesForCycle(
  tier?: PlanTier | string | null,
  _cycle: BillingCycle = 'yearly'
): PlanConfig & { durationDays: number; billingCycle: BillingCycle } {
  const base = getPlanConfig(tier);

  if (base.id === 'free') {
    return {
      ...base,
      durationDays: 36500, // lifetime
      billingCycle: 'yearly',
    };
  }

  return {
    ...base,
    credits: 120,
    aiSearchQuota: 3,
    promptRequests: 0,
    savesLimit: 999999,
    unlimitedSaves: true,
    unlockAllPrompts: true,
    durationDays: 365,
    billingCycle: 'yearly',
  };
}

/**
 * Calculates start and end timestamps for a subscription plan.
 * The expiration timestamp is guaranteed to be set to 11:59:59.999 PM of the target day.
 */
export function calculatePlanDates(
  startDateInput?: Date | string | number | null,
  durationDays: number = 365
): { planStartedAt: string; planExpiresAt: string } {
  const start = startDateInput ? new Date(startDateInput) : new Date();
  const safeStart = isNaN(start.getTime()) ? new Date() : start;

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
  durationDays: number = 365
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

