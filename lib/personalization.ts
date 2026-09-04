import { Category, PromptPost } from '@/types/prompt';

export type GenderVibe = 'all' | 'male' | 'female' | 'aesthetic' | 'anime' | 'tech' | 'creative';

export interface UserTasteProfile {
  genderVibe: GenderVibe;
  favoriteStyles: string[];
  favoriteTools: string[];
  categoryAffinities: Record<string, number>;
  tagAffinities: Record<string, number>;
  toolAffinities: Record<string, number>;
  clickedPostIds: Record<string, number>;
  copiedPostIds: string[];
  lastUpdated: string;
}

const STORAGE_KEY_TASTE_PROFILE = 'promptcms_taste_profile';

export const DEFAULT_STYLES = [
  'Photorealistic',
  'Cinematic 8K',
  '3D Character',
  'Cyberpunk City',
  'Anime Style',
  'Vintage 35mm',
  'Editorial Fashion',
  'Minimalist Logo',
  'Dark Fantasy',
  'Studio Lighting',
];

export const DEFAULT_TOOLS = [
  'Midjourney',
  'ChatGPT',
  'Flux',
  'Stable Diffusion',
  'Gemini',
  'Claude',
  'DALL-E 3',
];

export const INITIAL_TASTE_PROFILE: UserTasteProfile = {
  genderVibe: 'all',
  favoriteStyles: ['Photorealistic', 'Cinematic 8K', '3D Character'],
  favoriteTools: ['Midjourney', 'ChatGPT', 'Flux'],
  categoryAffinities: {},
  tagAffinities: {},
  toolAffinities: {},
  clickedPostIds: {},
  copiedPostIds: [],
  lastUpdated: new Date().toISOString(),
};

// Gender / Persona keywords for semantic matching
const MALE_KEYWORDS = [
  'man',
  'men',
  'male',
  'guy',
  'boy',
  'gentleman',
  'masculine',
  'father',
  'king',
  'brother',
  'cyberpunk samurai',
  'beard',
  'handsome',
  'suit',
  'warrior',
  'monk',
];

const FEMALE_KEYWORDS = [
  'woman',
  'women',
  'female',
  'girl',
  'lady',
  'queen',
  'model',
  'bride',
  'feminine',
  'sister',
  'mother',
  'princess',
  'goddess',
  'dress',
  'actress',
  'fashion editorial',
];

const ANIME_KEYWORDS = [
  'anime',
  'manga',
  'illustration',
  'chibi',
  'shonen',
  'cel shaded',
  'ghibli',
  'makoto shinkai',
  '2d',
  'kawaii',
  'japanese animation',
];

const TECH_KEYWORDS = [
  'cyberpunk',
  'futuristic',
  'robot',
  'ai',
  'sci-fi',
  'neon',
  'hologram',
  'mecha',
  'cybernetic',
  'dystopian',
  'tech',
];

const AESTHETIC_KEYWORDS = [
  'aesthetic',
  'minimalist',
  'pastel',
  'moody',
  'editorial',
  'vintage',
  'film grain',
  'golden hour',
  'polaroid',
  'monochrome',
  'cinematic',
];

export const PersonalizationEngine = {
  getProfile: (): UserTasteProfile => {
    if (typeof window === 'undefined') return INITIAL_TASTE_PROFILE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASTE_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_TASTE_PROFILE,
          ...parsed,
          categoryAffinities: parsed.categoryAffinities || {},
          tagAffinities: parsed.tagAffinities || {},
          toolAffinities: parsed.toolAffinities || {},
          clickedPostIds: parsed.clickedPostIds || {},
          copiedPostIds: parsed.copiedPostIds || [],
        };
      }
    } catch (e) {
      console.error('Failed to load taste profile:', e);
    }
    return INITIAL_TASTE_PROFILE;
  },

  saveProfile: (profile: UserTasteProfile): void => {
    if (typeof window === 'undefined') return;
    try {
      const updated = {
        ...profile,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_TASTE_PROFILE, JSON.stringify(updated));
      window.dispatchEvent(new Event('taste_profile_updated'));
    } catch (e) {
      console.error('Failed to save taste profile:', e);
    }
  },

  // Record a view/click event on a prompt
  recordView: (post: PromptPost): UserTasteProfile => {
    const profile = PersonalizationEngine.getProfile();
    const cat = post.category;
    const tool = post.aiTool;

    profile.clickedPostIds[post.id] = (profile.clickedPostIds[post.id] || 0) + 1;
    profile.categoryAffinities[cat] = (profile.categoryAffinities[cat] || 0) + 2;
    if (tool) {
      profile.toolAffinities[tool] = (profile.toolAffinities[tool] || 0) + 1;
    }

    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag) => {
        profile.tagAffinities[tag] = (profile.tagAffinities[tag] || 0) + 1;
      });
    }

    PersonalizationEngine.saveProfile(profile);
    return profile;
  },

  // Record bookmark save/unsave
  recordSave: (post: PromptPost, isSaving: boolean): UserTasteProfile => {
    const profile = PersonalizationEngine.getProfile();
    const delta = isSaving ? 6 : -3;
    const cat = post.category;
    const tool = post.aiTool;

    profile.categoryAffinities[cat] = Math.max(0, (profile.categoryAffinities[cat] || 0) + delta);
    if (tool) {
      profile.toolAffinities[tool] = Math.max(0, (profile.toolAffinities[tool] || 0) + (isSaving ? 4 : -2));
    }

    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag) => {
        profile.tagAffinities[tag] = Math.max(0, (profile.tagAffinities[tag] || 0) + (isSaving ? 3 : -1));
      });
    }

    PersonalizationEngine.saveProfile(profile);
    return profile;
  },

  // Record like/unlike
  recordLike: (post: PromptPost, isLiking: boolean): UserTasteProfile => {
    const profile = PersonalizationEngine.getProfile();
    const delta = isLiking ? 4 : -2;
    const cat = post.category;
    const tool = post.aiTool;

    profile.categoryAffinities[cat] = Math.max(0, (profile.categoryAffinities[cat] || 0) + delta);
    if (tool) {
      profile.toolAffinities[tool] = Math.max(0, (profile.toolAffinities[tool] || 0) + (isLiking ? 3 : -1));
    }

    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag) => {
        profile.tagAffinities[tag] = Math.max(0, (profile.tagAffinities[tag] || 0) + (isLiking ? 2 : -1));
      });
    }

    PersonalizationEngine.saveProfile(profile);
    return profile;
  },

  // Record prompt copy action
  recordCopy: (post: PromptPost): UserTasteProfile => {
    const profile = PersonalizationEngine.getProfile();
    const cat = post.category;
    const tool = post.aiTool;

    if (!profile.copiedPostIds.includes(post.id)) {
      profile.copiedPostIds = [post.id, ...profile.copiedPostIds].slice(0, 50);
    }

    profile.categoryAffinities[cat] = (profile.categoryAffinities[cat] || 0) + 5;
    if (tool) {
      profile.toolAffinities[tool] = (profile.toolAffinities[tool] || 0) + 3;
    }

    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag) => {
        profile.tagAffinities[tag] = (profile.tagAffinities[tag] || 0) + 3;
      });
    }

    PersonalizationEngine.saveProfile(profile);
    return profile;
  },

  // Score a prompt for a given user profile
  scorePrompt: (
    post: PromptPost,
    profile: UserTasteProfile,
    bookmarkedIds: string[] = [],
    likedIds: string[] = []
  ): {
    score: number;
    matchPercentage: number;
    primaryReason: string;
    badges: string[];
  } => {
    let score = 0;
    const reasons: string[] = [];
    const badges: string[] = [];

    const isBookmarked = bookmarkedIds.includes(post.id);
    const isLiked = likedIds.includes(post.id);
    const isCopied = profile.copiedPostIds.includes(post.id);
    const viewCount = profile.clickedPostIds[post.id] || 0;

    // 1. Category Affinity (0 - 35 points)
    const catScore = profile.categoryAffinities[post.category] || 0;
    if (catScore > 0) {
      score += Math.min(catScore * 2, 35);
      if (catScore >= 6) {
        reasons.push(`Top Category: ${post.category}`);
      }
    }

    // 2. Tag & Style Overlap (0 - 30 points)
    let tagScore = 0;
    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag) => {
        const aff = profile.tagAffinities[tag] || 0;
        tagScore += aff * 1.5;

        // Check if matches user's chosen favorite styles
        const isFavStyle = profile.favoriteStyles.some(
          (style) => tag.toLowerCase().includes(style.toLowerCase()) || style.toLowerCase().includes(tag.toLowerCase())
        );
        if (isFavStyle) {
          tagScore += 5;
          badges.push(tag);
        }
      });
    }
    score += Math.min(tagScore, 30);

    // 3. AI Tool Preference (0 - 15 points)
    const toolScore = profile.toolAffinities[post.aiTool] || 0;
    const isFavTool = profile.favoriteTools.includes(post.aiTool);
    if (isFavTool) {
      score += 10;
      badges.push(post.aiTool);
    }
    if (toolScore > 0) {
      score += Math.min(toolScore * 1.5, 5);
    }

    // 4. Gender / Persona Vibe Matching (0 - 25 points)
    const textCorpus = `${post.title} ${post.promptText} ${(post.tags || []).join(' ')} ${post.category}`.toLowerCase();

    if (profile.genderVibe === 'male') {
      const match = MALE_KEYWORDS.some((kw) => textCorpus.includes(kw));
      if (match) {
        score += 25;
        reasons.push('Matches Male / Men’s Styling');
      }
    } else if (profile.genderVibe === 'female') {
      const match = FEMALE_KEYWORDS.some((kw) => textCorpus.includes(kw));
      if (match) {
        score += 25;
        reasons.push('Matches Female & Fashion Styling');
      }
    } else if (profile.genderVibe === 'anime') {
      const match = ANIME_KEYWORDS.some((kw) => textCorpus.includes(kw));
      if (match) {
        score += 25;
        reasons.push('Matches Anime & Manga Taste');
      }
    } else if (profile.genderVibe === 'tech') {
      const match = TECH_KEYWORDS.some((kw) => textCorpus.includes(kw));
      if (match) {
        score += 25;
        reasons.push('Matches Cyberpunk & Sci-Fi');
      }
    } else if (profile.genderVibe === 'aesthetic') {
      const match = AESTHETIC_KEYWORDS.some((kw) => textCorpus.includes(kw));
      if (match) {
        score += 25;
        reasons.push('Matches Minimalist & Aesthetic Vibe');
      }
    }

    // 5. Direct Interactions
    if (isBookmarked) {
      score += 15;
      reasons.push('Saved to your boards');
    }
    if (isLiked) {
      score += 10;
      reasons.push('Liked by you');
    }
    if (isCopied) {
      score += 12;
      reasons.push('Previously copied');
    }
    if (viewCount > 0) {
      score += Math.min(viewCount * 2, 8);
    }

    // 6. Global engagement base points
    const views = post.viewsCount || 0;
    const copies = post.copiesCount || 0;
    const likes = post.likesCount || 0;
    const globalVelocity = Math.min((copies * 2 + likes + views * 0.1) * 0.05, 10);
    score += globalVelocity;

    // Normalize match percentage to a realistic Pinterest-like 75% - 99% for top items
    const rawMatch = Math.min(Math.max(Math.round((score / 80) * 100), 65), 99);

    const primaryReason =
      reasons.length > 0
        ? reasons[0]
        : badges.length > 0
        ? `Inspired by #${badges[0]}`
        : `Tuned for ${post.category}`;

    return {
      score,
      matchPercentage: rawMatch,
      primaryReason,
      badges: Array.from(new Set(badges)).slice(0, 3),
    };
  },

  // Rank categories dynamically based on user engagement
  getPersonalizedCategoryOrder: (categories: Category[], profile: UserTasteProfile): Category[] => {
    return [...categories].sort((a, b) => {
      const scoreA = profile.categoryAffinities[a.name] || 0;
      const scoreB = profile.categoryAffinities[b.name] || 0;
      return scoreB - scoreA;
    });
  },

  // Get top user affinities for UI summary
  getTasteSummary: (profile: UserTasteProfile) => {
    const sortedCategories = Object.entries(profile.categoryAffinities)
      .sort((a, b) => b[1] - a[1])
      .map(([name, score]) => ({ name, score }));

    const sortedTags = Object.entries(profile.tagAffinities)
      .sort((a, b) => b[1] - a[1])
      .map(([name, score]) => ({ name, score }));

    const sortedTools = Object.entries(profile.toolAffinities)
      .sort((a, b) => b[1] - a[1])
      .map(([name, score]) => ({ name, score }));

    const totalEngagementScore =
      Object.values(profile.categoryAffinities).reduce((acc, v) => acc + v, 0) +
      Object.values(profile.tagAffinities).reduce((acc, v) => acc + v, 0) +
      Object.values(profile.toolAffinities).reduce((acc, v) => acc + v, 0);

    return {
      topCategories: sortedCategories.slice(0, 3),
      topTags: sortedTags.slice(0, 5),
      topTools: sortedTools.slice(0, 3),
      totalEngagementScore,
      genderVibe: profile.genderVibe,
      favoriteStyles: profile.favoriteStyles,
    };
  },
};
