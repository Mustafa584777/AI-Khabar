import { Category, PromptPost, SiteSettings } from '@/types/prompt';
import { PushNotificationItem } from '@/types/notification';
import initialFeedData from '@/data/initial-feed.json';
import categoryCountsData from '@/data/category-counts.json';
import defaultCategoriesData from '@/data/categories.json';
import defaultSettingsData from '@/data/settings.json';
import defaultNotificationsData from '@/data/notifications.json';
import { hydrateCompactPosts } from './post-normalizer';

export const INITIAL_FEED_POSTS: PromptPost[] = hydrateCompactPosts(initialFeedData);

export const INITIAL_CATEGORY_COUNTS: Record<string, number> =
  categoryCountsData && typeof categoryCountsData === 'object'
    ? (categoryCountsData as Record<string, number>)
    : {};

export const INITIAL_FEED_CATEGORIES: Category[] = (
  Array.isArray(defaultCategoriesData) && defaultCategoriesData.length > 0
    ? defaultCategoriesData
    : []
) as unknown as Category[];

export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = (
  Array.isArray(defaultNotificationsData) ? defaultNotificationsData : []
) as unknown as PushNotificationItem[];

export const INITIAL_FEED_SETTINGS: SiteSettings = (
  defaultSettingsData && typeof defaultSettingsData === 'object'
    ? defaultSettingsData
    : {
        siteName: 'Zeenaprompt',
        siteTagline: 'Free Copy-Paste AI Photo Prompts, Codes & Creative Guides',
        siteUrl: 'https://zeenaprompt.com',
        logoText: 'Zeenaprompt',
        heroHeadline: 'Trending Copy Paste Photo Prompts',
        heroSubheadline:
          "Explore professionally crafted photo prompts for Gemini, and ChatGPT. Copy with 1 click. Decode any image's prompt, generate new version, create new prompt from idea or edit an existing one.",
        defaultTool: 'Gemini',
        enableAiGenerator: true,
        footerText:
          '© 2026 Zeenaprompt - Built for creators, designers & engineers. All prompts free to copy and commercial use.',
        adminEmail: 'admin@zeenaprompt.com',
        popularTags: [
          'Traditional saree',
          'trending mirror selfie',
          'BMW',
          'Sukuna',
          'Instagram Trend',
          'Couple',
        ],
      }
) as unknown as SiteSettings;
