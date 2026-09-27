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

/**
 * Calculate the expiry date 30 days from a start date,
 * strictly anchored to 11:59:59 PM (23:59:59.999 IST / 18:29:59.999 UTC)
 * of the expiration day.
 */
export function computePlanExpiry(startDate: Date | string, durationDays: number = 30): string {
  try {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return computePlanExpiry(now, durationDays);
    }
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || `${d.getUTCFullYear()}`, 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || `${d.getUTCMonth() + 1}`, 10);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || `${d.getUTCDate()}`, 10);

    // 23:59:59.999 IST is 18:29:59.999 UTC
    const expUtc = new Date(Date.UTC(year, month - 1, day + durationDays, 18, 29, 59, 999));
    return expUtc.toISOString();
  } catch {
    const d = new Date(startDate);
    d.setDate(d.getDate() + durationDays);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }
}

/**
 * Format plan expiry date with 11:59 PM time for human-readable display.
 * e.g. "October 26, 2026 at 11:59 PM"
 */
export function formatPlanDateWithTime(isoDate?: string | null): string {
  if (!isoDate) return 'Active';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'Active';
    const datePart = d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `${datePart} at 11:59 PM`;
  } catch {
    return 'Active';
  }
}

/**
 * Format plan start date.
 * e.g. "September 26, 2026"
 */
export function formatPlanDateOnly(isoDate?: string | null): string {
  if (!isoDate) return 'Today';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'Today';
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Today';
  }
}
