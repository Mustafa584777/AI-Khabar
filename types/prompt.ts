export type AITool =
  | 'Midjourney'
  | 'ChatGPT'
  | 'Flux'
  | 'Stable Diffusion'
  | 'Claude'
  | 'Gemini'
  | 'Sora'
  | 'DALL-E 3'
  | 'Leonardo AI';

export interface PromptVariable {
  id: string;
  name: string; // e.g. "subject" for [subject]
  label: string; // e.g. "Main Subject"
  defaultValue: string;
  description?: string;
  options?: string[]; // predefined choices if any
}

export interface PromptParameters {
  aspectRatio?: string; // e.g. "16:9", "9:16", "1:1"
  model?: string; // e.g. "v6.1", "GPT-4o", "Flux.1 Schnell"
  stylize?: string; // e.g. "250"
  chaos?: string;
  weird?: string;
  cfgScale?: string; // e.g. "7.0"
  steps?: string; // e.g. "30"
  sampler?: string; // e.g. "Euler a"
  seed?: string;
  lighting?: string; // e.g. "Cinematic Golden Hour"
  camera?: string; // e.g. "Sony A7 IV, 85mm f/1.4"
  renderEngine?: string; // e.g. "Unreal Engine 5, Octane Render"
  temperature?: string; // For text models
  [key: string]: string | undefined;
}

export interface Author {
  name: string;
  avatar: string;
  role: string;
  email?: string;
}

export interface SEOMeta {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl?: string;
  ogImage?: string;
}

export interface PromptPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  aiTool: AITool;
  promptText: string;
  negativePrompt?: string;
  imageUrl: string;
  imageAlt?: string;
  imageFileName?: string;
  imageWidth?: number;
  imageHeight?: number;
  additionalImages?: string[];
  parameters?: PromptParameters;
  variables?: PromptVariable[];
  articleContent: string; // Rich markdown or HTML guide
  tags: string[];
  status: 'published' | 'draft' | 'scheduled';
  isFeatured?: boolean;
  isTrending?: boolean;
  isRequested?: boolean;
  requestedByName?: string;
  requestedByEmail?: string;
  requestedPromptDescription?: string;
  viewsCount: number;
  copiesCount: number;
  likesCount: number;
  bookmarksCount?: number;
  seoTitle?: string;
  seoDescription?: string;
  author: Author;
  seo: SEOMeta;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  description: string;
  color?: string;
  badgeBg?: string;
  imageUrl?: string;
  count?: number;
  sortOrder?: number;
}

export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  siteUrl: string;
  logoText: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroHeadline: string;
  heroSubheadline: string;
  defaultTool: AITool;
  enableAiGenerator: boolean;
  footerText: string;
  adminEmail: string;
  popularTags?: string[];
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryUploadPreset?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Editor' | 'Author';
  avatar: string;
  lastLogin?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  joinedDate: string;
  isLoggedIn: boolean;
  points: number;
  requestsMade: number;
  likesCountForPoints: number;
  savesCountForPoints: number;
  generationsCountForPoints: number;
  sharesCountForPoints: number;
  referralsCountForPoints: number;
}

export interface PromptRequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  requestText: string;
  category?: string;
  aiTool?: string;
  status: 'pending' | 'in_progress' | 'completed';
  fulfilledPostId?: string;
  createdAt: number;
  likesCount: number;
}

export interface AIHistoryItem {
  id: string;
  type: 'image_to_prompt' | 'prompt_to_image';
  title: string;
  promptText: string;
  negativePrompt?: string;
  imageUrl?: string; // Generated art or uploaded reference
  referenceImageUrl?: string;
  aspectRatio?: string;
  modelUsed?: string;
  stylePreset?: string;
  camera?: string;
  lighting?: string;
  composition?: string;
  colorPalette?: string;
  tags?: string[];
  createdAt: number;
  userId?: string;
}

export interface SearchQueryItem {
  id?: string;
  query: string;
  count: number;
  lastSearched: number;
}

