import { Category, PromptPost, SiteSettings, SearchQueryItem } from '@/types/prompt';
import { INITIAL_CATEGORIES, INITIAL_SETTINGS } from './initial-data';
import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';

const SETTINGS_DOC_ID = 'site_settings';
const TAGS_DOC_ID = 'site_tags';

const DEFAULT_TAGS = [
  'Portrait', '35mm', 'Cinematic', 'Street Photography', 'Fashion',
  'Monochrome', 'Tokyo', 'Cyberpunk', 'Studio Ghibli', 'Japandi',
  'Architecture', '3D Render', 'Pixar', 'Underwater', 'Logo', 'Minimalist'
];

function cleanData<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanData(item) : item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = cleanData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

interface CacheStore<T> {
  data: T;
  timestamp: number;
}

const READ_CACHE_TTL_MS = 60 * 1000; // 60s cache TTL

let memoryPostsCache: CacheStore<PromptPost[]> | null = null;
let memoryCategoriesCache: CacheStore<Category[]> | null = null;
let memorySettingsCache: CacheStore<SiteSettings> | null = null;
let memoryTagsCache: CacheStore<string[]> | null = null;
let memorySearchQueriesCache: CacheStore<SearchQueryItem[]> | null = null;

// Helpers to map Supabase snake_case rows to PromptPost
function mapSupabasePost(row: any): PromptPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    promptText: row.prompt_text,
    imageUrl: row.image_url,
    imageAlt: row.image_alt || row.title,
    imageWidth: row.image_width || 1024,
    imageHeight: row.image_height || 1536,
    aiTool: row.ai_tool || 'Midjourney',
    articleContent: row.article_content || row.prompt_text,
    seo: row.seo || { metaTitle: row.title, metaDescription: row.seo_description || row.prompt_text?.substring(0, 160) || '', focusKeyword: row.category },
    status: row.status || 'published',
    tags: row.tags || [],
    author: row.author || { name: 'tool.reelz', avatar: '/logo.png', role: 'Author' },
    viewsCount: row.views_count || 0,
    copiesCount: row.copies_count || 0,
    likesCount: row.likes_count || 0,
    bookmarksCount: row.bookmarks_count || 0,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPostToSupabase(post: PromptPost) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    category: post.category,
    prompt_text: post.promptText,
    image_url: post.imageUrl,
    image_alt: post.imageAlt || post.title,
    image_width: post.imageWidth || 1024,
    image_height: post.imageHeight || 1536,
    status: post.status || 'published',
    tags: post.tags || [],
    author: post.author || { name: 'tool.reelz', avatar: '/logo.png', role: 'Author' },
    views_count: post.viewsCount || 0,
    copies_count: post.copiesCount || 0,
    likes_count: post.likesCount || 0,
    bookmarks_count: post.bookmarksCount || 0,
    seo_title: post.seoTitle || null,
    seo_description: post.seoDescription || null,
    published_at: post.publishedAt || null,
    created_at: post.createdAt || new Date().toISOString(),
    updated_at: post.updatedAt || new Date().toISOString(),
  };
}

export const ServerStorage = {
  // Posts
  getAllPosts: async (includeDrafts = true): Promise<PromptPost[]> => {
    if (memoryPostsCache && (Date.now() - memoryPostsCache.timestamp < READ_CACHE_TTL_MS)) {
      return includeDrafts ? memoryPostsCache.data : memoryPostsCache.data.filter((p) => p.status === 'published');
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const posts = data.map(mapSupabasePost);
          memoryPostsCache = { data: posts, timestamp: Date.now() };
          return includeDrafts ? posts : posts.filter((p) => p.status === 'published');
        }
      } catch (err) {
        console.warn('Supabase getAllPosts fallback:', err);
      }
    }

    if (memoryPostsCache && memoryPostsCache.data) {
      return includeDrafts ? memoryPostsCache.data : memoryPostsCache.data.filter((p) => p.status === 'published');
    }

    return [];
  },

  getPostBySlug: async (slug: string): Promise<PromptPost | undefined> => {
    if (isSupabaseConfigured()) {
      try {
        const targetSlug = slug.toLowerCase().trim();
        const { data, error } = await supabase.from('posts').select('*').or(`slug.eq.${targetSlug},id.eq.${targetSlug}`).maybeSingle();
        if (!error && data) {
          return mapSupabasePost(data);
        }
      } catch (err) {
        console.warn('Supabase getPostBySlug fallback:', err);
      }
    }

    const posts = await ServerStorage.getAllPosts(true);
    const targetSlug = slug.toLowerCase().trim();
    return posts.find((p) => {
      if (p.slug && p.slug.toLowerCase() === targetSlug) return true;
      if (p.id && p.id.toLowerCase() === targetSlug) return true;
      if (p.title) {
        const titleSlug = p.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (titleSlug === targetSlug) return true;
      }
      return false;
    });
  },

  getPostById: async (id: string): Promise<PromptPost | undefined> => {
    if (memoryPostsCache?.data) {
      const found = memoryPostsCache.data.find((p) => p.id === id);
      if (found) return found;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
        if (!error && data) return mapSupabasePost(data);
      } catch (err) {
        console.warn('Supabase getPostById fallback:', err);
      }
    }

    const posts = await ServerStorage.getAllPosts(true);
    return posts.find((p) => p.id === id);
  },

  savePost: async (post: PromptPost): Promise<PromptPost> => {
    const now = new Date().toISOString();
    const id = post.id || `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let existing: PromptPost | undefined = undefined;
    if (memoryPostsCache?.data) {
      existing = memoryPostsCache.data.find((p) => p.id === id);
    }

    let savedPost: PromptPost;
    if (existing) {
      savedPost = {
        ...post,
        id,
        author: {
          name: 'tool.reelz',
          avatar: '/logo.png',
          role: 'Author',
        },
        updatedAt: now,
        publishedAt: post.status === 'published' && !existing.publishedAt
            ? now
            : existing.publishedAt || (post.status === 'published' ? now : undefined),
      };
    } else {
      savedPost = {
        ...post,
        id,
        author: {
          name: 'tool.reelz',
          avatar: '/logo.png',
          role: 'Author',
        },
        createdAt: post.createdAt || now,
        updatedAt: now,
        publishedAt: post.status === 'published' ? (post.publishedAt || now) : undefined,
        viewsCount: post.viewsCount || 0,
        copiesCount: post.copiesCount || 0,
        likesCount: post.likesCount || 0,
      };
    }

    const currentList = memoryPostsCache?.data ? [...memoryPostsCache.data] : [];
    const index = currentList.findIndex((p) => p.id === id);
    if (index >= 0) {
      currentList[index] = savedPost;
    } else {
      currentList.unshift(savedPost);
    }
    memoryPostsCache = { data: currentList, timestamp: Date.now() };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('posts').upsert(mapPostToSupabase(savedPost));
      } catch (err) {
        console.warn('Supabase savePost error:', err);
      }
    }

    // Auto-create category if needed
    if (savedPost.category && savedPost.category.trim()) {
      try {
        const catName = savedPost.category.trim();
        const existingCats = await ServerStorage.getAllCategories();
        const exists = existingCats.some(
          (c) => c.name.toLowerCase() === catName.toLowerCase()
        );

        if (!exists) {
          const cleanSlug = catName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
          
          const newCategory: Category = {
            id: `cat-${Date.now()}`,
            name: catName,
            slug: cleanSlug,
            iconName: 'Sparkles',
            description: `${catName} AI image prompts and inspirations.`,
            imageUrl: savedPost.imageUrl,
            count: 1,
            sortOrder: existingCats.length + 1,
          };
          await ServerStorage.saveCategory(newCategory);
        }
      } catch {}
    }

    return savedPost;
  },

  deletePost: async (id: string): Promise<void> => {
    if (memoryPostsCache?.data) {
      const filtered = memoryPostsCache.data.filter((p) => p.id !== id);
      memoryPostsCache = { data: filtered, timestamp: Date.now() };
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('posts').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deletePost error:', err);
      }
    }
  },

  restorePosts: async (incomingPosts: PromptPost[], mode: 'replace' | 'merge'): Promise<PromptPost[]> => {
    if (mode === 'replace') {
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('posts').delete().neq('id', '___force_delete_all_anchor___');
        } catch (err) {
          console.warn('Supabase restorePosts clear error:', err);
        }
      }
      memoryPostsCache = { data: [], timestamp: Date.now() };
    }

    for (const p of incomingPosts) {
      await ServerStorage.savePost(p);
    }

    return await ServerStorage.getAllPosts(true);
  },

  incrementViews: async (id: string): Promise<void> => {
    const post = await ServerStorage.getPostById(id);
    if (post) {
      post.viewsCount = (post.viewsCount || 0) + 1;
      await ServerStorage.savePost(post);
    }
  },

  incrementCopies: async (id: string): Promise<void> => {
    const post = await ServerStorage.getPostById(id);
    if (post) {
      post.copiesCount = (post.copiesCount || 0) + 1;
      await ServerStorage.savePost(post);
    }
  },

  incrementCopyCount: async (id: string): Promise<void> => {
    return await ServerStorage.incrementCopies(id);
  },

  incrementViewCount: async (id: string): Promise<void> => {
    return await ServerStorage.incrementViews(id);
  },

  toggleLike: async (id: string): Promise<void> => {
    const post = await ServerStorage.getPostById(id);
    if (post) {
      post.likesCount = (post.likesCount || 0) + 1;
      await ServerStorage.savePost(post);
    }
  },

  // Categories
  getAllCategories: async (): Promise<Category[]> => {
    if (memoryCategoriesCache && (Date.now() - memoryCategoriesCache.timestamp < READ_CACHE_TTL_MS)) {
      return memoryCategoriesCache.data;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          const cats = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            iconName: row.icon_name || 'Sparkles',
            description: row.description,
            imageUrl: row.image_url,
            count: row.count || 0,
            sortOrder: row.sort_order || 0,
          }));
          memoryCategoriesCache = { data: cats, timestamp: Date.now() };
          return cats;
        }
      } catch (err) {
        console.warn('Supabase getAllCategories fallback:', err);
      }
    }

    const defaultCategories = INITIAL_CATEGORIES.map((c, i) => ({
      ...c,
      sortOrder: i,
    }));
    memoryCategoriesCache = { data: defaultCategories, timestamp: Date.now() };
    return defaultCategories;
  },

  saveCategory: async (category: Category): Promise<Category> => {
    const current = await ServerStorage.getAllCategories();
    const index = current.findIndex((c) => c.id === category.id);
    let updated: Category[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = category;
    } else {
      updated = [...current, category];
    }
    memoryCategoriesCache = { data: updated, timestamp: Date.now() };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').upsert({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image_url: category.imageUrl,
          count: category.count || 0,
          sort_order: category.sortOrder || 0,
        });
      } catch (err) {
        console.warn('Supabase saveCategory error:', err);
      }
    }

    return category;
  },

  deleteCategory: async (id: string): Promise<Category[]> => {
    const current = await ServerStorage.getAllCategories();
    const filtered = current.filter((c) => c.id !== id);
    memoryCategoriesCache = { data: filtered, timestamp: Date.now() };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteCategory error:', err);
      }
    }

    return filtered;
  },

  // Search Queries
  recordSearch: async (queryText: string): Promise<void> => {
    const clean = queryText.trim();
    if (!clean || clean.length < 2) return;
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase.from('search_queries').select('*').eq('query', clean).maybeSingle();
        if (data) {
          await supabase.from('search_queries').update({
            count: (data.count || 1) + 1,
            last_searched_at: new Date().toISOString(),
          }).eq('id', data.id);
        } else {
          await supabase.from('search_queries').insert({
            id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            query: clean,
            count: 1,
            last_searched_at: new Date().toISOString(),
          });
        }
      }
    } catch {}
  },

  recordSearchQuery: async (queryText: string): Promise<void> => {
    return await ServerStorage.recordSearch(queryText);
  },

  getTopSearchQueries: async (limitCount = 12): Promise<SearchQueryItem[]> => {
    const defaultQueries = [
      'Cyberpunk neon portrait',
      'Cinematic golden hour',
      'Vintage 35mm film',
      'Anime masterpiece',
      'Minimalist aesthetic logo',
      'Hyperrealistic 8K model',
      'Moody luxury portrait',
      'Unreal Engine 3D render',
      'Japandi aesthetic living room',
      'Dark academia aesthetic',
    ].map((q, i) => ({
      query: q,
      count: 50 - i * 3,
      lastSearched: Date.now(),
    }));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('search_queries').select('*').order('count', { ascending: false }).limit(limitCount);
        if (!error && data && data.length > 0) {
          return data.map((row: any) => ({
            query: row.query,
            count: row.count || 1,
            lastSearched: row.last_searched_at ? new Date(row.last_searched_at).getTime() : Date.now(),
          }));
        }
      } catch {}
    }

    return defaultQueries.slice(0, limitCount);
  },

  // Settings
  getSettings: async (): Promise<SiteSettings> => {
    if (memorySettingsCache && (Date.now() - memorySettingsCache.timestamp < READ_CACHE_TTL_MS)) {
      return memorySettingsCache.data;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', SETTINGS_DOC_ID).maybeSingle();
        if (!error && data && data.data) {
          memorySettingsCache = { data: data.data, timestamp: Date.now() };
          return data.data;
        }
      } catch {}
    }

    memorySettingsCache = { data: INITIAL_SETTINGS, timestamp: Date.now() };
    return INITIAL_SETTINGS;
  },

  saveSettings: async (newSettings: Partial<SiteSettings>): Promise<SiteSettings> => {
    const current = await ServerStorage.getSettings();
    const updated = { ...current, ...newSettings };
    memorySettingsCache = { data: updated, timestamp: Date.now() };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('settings').upsert({
          id: SETTINGS_DOC_ID,
          data: cleanData(updated),
        });
      } catch (err) {
        console.warn('Supabase saveSettings error:', err);
      }
    }

    return updated;
  },

  // Tags
  getAllTags: async (): Promise<string[]> => {
    if (memoryTagsCache && (Date.now() - memoryTagsCache.timestamp < READ_CACHE_TTL_MS)) {
      return memoryTagsCache.data;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('tags').select('*').eq('id', TAGS_DOC_ID).maybeSingle();
        if (!error && data && data.tags) {
          memoryTagsCache = { data: data.tags, timestamp: Date.now() };
          return data.tags;
        }
      } catch {}
    }

    memoryTagsCache = { data: DEFAULT_TAGS, timestamp: Date.now() };
    return DEFAULT_TAGS;
  },

  addTag: async (tag: string): Promise<string[]> => {
    const cleanTag = tag.trim().replace(/^#/, '');
    if (!cleanTag) return await ServerStorage.getAllTags();
    const current = await ServerStorage.getAllTags();
    if (current.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
      return current;
    }
    const updated = [cleanTag, ...current];
    memoryTagsCache = { data: updated, timestamp: Date.now() };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tags').upsert({
          id: TAGS_DOC_ID,
          tags: updated,
        });
      } catch (err) {
        console.warn('Supabase addTag error:', err);
      }
    }

    return updated;
  },

  deleteTag: async (tag: string): Promise<string[]> => {
    const current = await ServerStorage.getAllTags();
    const filtered = current.filter((t) => t.toLowerCase() !== tag.toLowerCase());
    memoryTagsCache = { data: filtered, timestamp: Date.now() };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tags').upsert({
          id: TAGS_DOC_ID,
          tags: filtered,
        });
      } catch (err) {
        console.warn('Supabase deleteTag error:', err);
      }
    }

    return filtered;
  },
};
