import { Category, PromptPost, SiteSettings, SearchQueryItem, PromptRequestItem } from '@/types/prompt';
import { INITIAL_CATEGORIES, INITIAL_SETTINGS, INITIAL_POSTS } from './initial-data';
import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';
import { cleanTagsArray, canonicalizeTag } from './tag-utils';
import { uploadImageToCloudinary } from './cloudinary-server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const SEARCH_QUERIES_FILE = path.join(DATA_DIR, 'search_queries.json');
const PROMPT_REQUESTS_FILE = path.join(DATA_DIR, 'prompt_requests.json');

const DEFAULT_TAGS = [
  'Portrait', '35mm', 'Cinematic', 'Street Photography', 'Fashion',
  'Monochrome', 'Tokyo', 'Cyberpunk', 'Studio Ghibli', 'Japandi',
  'Architecture', '3D Render', 'Pixar', 'Underwater', 'Logo', 'Minimalist'
];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// In-memory runtime cache
let memoryPosts: PromptPost[] | null = null;
let memoryCategories: Category[] | null = null;
let memorySettings: SiteSettings | null = null;
let memoryTags: string[] | null = null;
let memorySearchQueries: SearchQueryItem[] | null = null;
let memoryPromptRequests: PromptRequestItem[] | null = null;

// Helpers to map Supabase snake_case rows to PromptPost
function mapSupabasePost(row: any): PromptPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    aiTool: row.ai_tool || 'Midjourney',
    promptText: row.prompt_text,
    negativePrompt: row.negative_prompt || undefined,
    imageUrl: row.image_url,
    imageAlt: row.image_alt || undefined,
    imageWidth: row.image_width || 1024,
    imageHeight: row.image_height || 1536,
    additionalImages: Array.isArray(row.additional_images) ? row.additional_images : [],
    parameters: typeof row.parameters === 'object' && row.parameters !== null ? row.parameters : {},
    variables: Array.isArray(row.variables) ? row.variables : [],
    articleContent: row.article_content || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status || 'published',
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    isRequested: Boolean(row.is_requested || row.isRequested),
    requestedByName: row.requested_by_name || row.requestedByName || undefined,
    requestedByEmail: row.requested_by_email || row.requestedByEmail || undefined,
    requestedByAvatar: row.requested_by_avatar || row.requestedByAvatar || undefined,
    requestedPromptDescription: row.requested_prompt_description || row.requestedPromptDescription || undefined,
    viewsCount: Number(row.views_count) || 0,
    copiesCount: Number(row.copies_count) || 0,
    likesCount: Number(row.likes_count) || 0,
    bookmarksCount: Number(row.bookmarks_count) || 0,
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    author: row.author || {
      name: 'tool.reelz',
      avatar: '/logo.png',
      role: 'Author',
    },
    seo: row.seo || {
      metaTitle: row.seo_title || row.title,
      metaDescription: row.seo_description || '',
      focusKeyword: '',
    },
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    publishedAt: row.published_at || undefined,
  };
}

function mapPostToSupabase(post: PromptPost) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    category: post.category,
    ai_tool: post.aiTool || 'Midjourney',
    prompt_text: post.promptText,
    negative_prompt: post.negativePrompt || null,
    image_url: post.imageUrl,
    image_alt: post.imageAlt || null,
    image_width: post.imageWidth || 1024,
    image_height: post.imageHeight || 1536,
    additional_images: post.additionalImages || [],
    parameters: post.parameters || {},
    variables: post.variables || [],
    article_content: post.articleContent || '',
    tags: post.tags || [],
    status: post.status || 'published',
    is_featured: Boolean(post.isFeatured),
    is_trending: Boolean(post.isTrending),
    is_requested: Boolean(post.isRequested),
    requested_by_name: post.requestedByName || null,
    requested_by_email: post.requestedByEmail || null,
    requested_prompt_description: post.requestedPromptDescription || null,
    views_count: Number(post.viewsCount) || 0,
    copies_count: Number(post.copiesCount) || 0,
    likes_count: Number(post.likesCount) || 0,
    bookmarks_count: Number(post.bookmarksCount) || 0,
    seo_title: post.seoTitle || post.seo?.metaTitle || null,
    seo_description: post.seoDescription || post.seo?.metaDescription || null,
    author: post.author || {
      name: 'tool.reelz',
      avatar: '/logo.png',
      role: 'Author',
    },
    seo: post.seo || {},
    published_at: post.publishedAt || (post.status === 'published' ? new Date().toISOString() : null),
    created_at: post.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const db = () => supabaseAdmin || supabase;

export const ServerStorage = {
  // Posts
  getAllPosts: async (includeDrafts = true): Promise<PromptPost[]> => {
    let localPosts: PromptPost[] = [];
    try {
      const rawPosts = readJsonFile<PromptPost[]>(POSTS_FILE, INITIAL_POSTS || []);
      localPosts = rawPosts.map((p) => ({
        ...p,
        tags: cleanTagsArray(p.tags || []),
      }));
    } catch (e) {
      localPosts = INITIAL_POSTS || [];
    }

    if (isSupabaseConfigured()) {
      try {
        let query = db().from('posts').select('*').order('created_at', { ascending: false });
        if (!includeDrafts) {
          query = query.eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && data && Array.isArray(data)) {
          const supabasePosts = data.map((d) => {
            const mapped = mapSupabasePost(d);
            mapped.tags = cleanTagsArray(mapped.tags || []);
            return mapped;
          });

          // Merge localPosts and supabasePosts by ID, prioritizing the most recent updatedAt/createdAt
          const map = new Map<string, PromptPost>();
          // Put local posts first, then overwrite/merge with Supabase posts
          localPosts.forEach(p => map.set(p.id, p));
          supabasePosts.forEach(p => {
            const existing = map.get(p.id);
            if (!existing || new Date(p.updatedAt || p.createdAt || 0).getTime() >= new Date(existing.updatedAt || existing.createdAt || 0).getTime()) {
              map.set(p.id, p);
            }
          });

          const merged = Array.from(map.values()).sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );

          memoryPosts = merged;
          writeJsonFile(POSTS_FILE, merged);
          return includeDrafts ? merged : merged.filter((p) => p.status === 'published');
        }
      } catch (err) {
        console.warn('Supabase getAllPosts fallback:', err);
      }
    }

    if (memoryPosts === null) {
      memoryPosts = localPosts;
    }
    return includeDrafts ? memoryPosts : memoryPosts.filter((p) => p.status === 'published');
  },

  getPostBySlug: async (slug: string): Promise<PromptPost | undefined> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db()
          .from('posts')
          .select('*')
          .ilike('slug', slug.trim())
          .maybeSingle();
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db().from('posts').select('*').eq('id', id).maybeSingle();
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
    const posts = await ServerStorage.getAllPosts(true);
    const existing = posts.find((p) => p.id === id);

    let savedPost: PromptPost;
    if (existing) {
      savedPost = {
        ...existing,
        ...post,
        id,
        tags: cleanTagsArray(post.tags || existing.tags || []),
        author: post.author || {
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
        tags: cleanTagsArray(post.tags || []),
        author: post.author || {
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
        bookmarksCount: post.bookmarksCount || 0,
      };
    }

    // If image is a local base64 data URI, attempt auto-uploading to Cloudinary or save as static file in public/images/prompts/
    if (savedPost.imageUrl && savedPost.imageUrl.startsWith('data:image/')) {
      let uploadedToCloud = false;
      try {
        const clRes = await uploadImageToCloudinary(savedPost.imageUrl, {
          folder: 'prompts',
          publicId: savedPost.slug || savedPost.id,
        });
        if (clRes.success && clRes.url) {
          savedPost.imageUrl = clRes.url;
          uploadedToCloud = true;
        }
      } catch (uploadErr) {
        console.warn('ServerStorage Cloudinary auto-upload fallback:', uploadErr);
      }

      if (!uploadedToCloud) {
        try {
          const match = savedPost.imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            const safeId = (savedPost.id || `prompt_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            let ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            if (ext.includes('webp')) ext = 'webp';
            const promptsDir = path.join(process.cwd(), 'public', 'images', 'prompts');
            if (!fs.existsSync(promptsDir)) {
              fs.mkdirSync(promptsDir, { recursive: true });
            }
            const filename = `${safeId}.${ext}`;
            const filePath = path.join(promptsDir, filename);
            const buffer = Buffer.from(match[2], 'base64');
            fs.writeFileSync(filePath, buffer);
            savedPost.imageUrl = `/images/prompts/${filename}`;
          }
        } catch (localFileErr) {
          console.error('Failed to save static prompt image:', localFileErr);
        }
      }
    }

    // Save to Supabase
    if (isSupabaseConfigured()) {
      try {
        const payload = mapPostToSupabase(savedPost);
        const { error } = await db().from('posts').upsert(payload, { onConflict: 'id' });
        if (error) {
          console.warn('Supabase savePost error (falling back to local JSON):', error.message);
        } else {
          console.log(`Saved post ${savedPost.id} to Supabase successfully.`);
        }
      } catch (err: any) {
        console.warn('Supabase savePost exception (falling back to local JSON):', err);
      }
    }

    // Update local cache
    const currentList = [...posts];
    const index = currentList.findIndex((p) => p.id === id);
    if (index >= 0) {
      currentList[index] = savedPost;
    } else {
      currentList.unshift(savedPost);
    }
    memoryPosts = currentList;
    writeJsonFile(POSTS_FILE, currentList);

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
      } catch (e) {
        console.error('Auto create category error:', e);
      }
    }

    return savedPost;
  },

  deletePost: async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await db().from('posts').delete().eq('id', id);
        if (error) {
          console.error('Supabase deletePost error:', error.message);
        }
      } catch (err) {
        console.error('Supabase deletePost exception:', err);
      }
    }

    const posts = await ServerStorage.getAllPosts(true);
    const filtered = posts.filter((p) => p.id !== id);
    memoryPosts = filtered;
    writeJsonFile(POSTS_FILE, filtered);
  },

  restorePosts: async (incomingPosts: PromptPost[], mode: 'replace' | 'merge'): Promise<PromptPost[]> => {
    if (mode === 'replace') {
      if (isSupabaseConfigured()) {
        try {
          await db().from('posts').delete().neq('id', '___non_existing_guard___');
        } catch (err) {
          console.error('Supabase restorePosts clear error:', err);
        }
      }
      memoryPosts = [];
      writeJsonFile(POSTS_FILE, []);
    }

    for (const p of incomingPosts) {
      await ServerStorage.savePost(p);
    }
    return ServerStorage.getAllPosts(true);
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db().from('categories').select('*').order('sort_order', { ascending: true });
        if (!error && data && Array.isArray(data) && data.length > 0) {
          const cats: Category[] = data.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            iconName: c.icon_name || 'Sparkles',
            description: c.description || '',
            color: c.color || undefined,
            badgeBg: c.badge_bg || undefined,
            imageUrl: c.image_url || undefined,
            count: c.count || 0,
            sortOrder: c.sort_order || 0,
          }));
          memoryCategories = cats;
          writeJsonFile(CATEGORIES_FILE, cats);
          return cats;
        }
      } catch (err) {
        console.warn('Supabase getAllCategories fallback:', err);
      }
    }

    if (memoryCategories === null) {
      const initial = INITIAL_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i }));
      memoryCategories = readJsonFile<Category[]>(CATEGORIES_FILE, initial);
    }
    return memoryCategories;
  },

  saveCategory: async (category: Category): Promise<Category> => {
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon_name: category.iconName || 'Sparkles',
          description: category.description || '',
          color: category.color || null,
          badge_bg: category.badgeBg || null,
          image_url: category.imageUrl || null,
          count: category.count || 0,
          sort_order: category.sortOrder || 0,
        };
        await db().from('categories').upsert(payload, { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase saveCategory exception:', err);
      }
    }

    const current = await ServerStorage.getAllCategories();
    const index = current.findIndex((c) => c.id === category.id);
    let updated: Category[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = category;
    } else {
      updated = [...current, category];
    }
    memoryCategories = updated;
    writeJsonFile(CATEGORIES_FILE, updated);
    return category;
  },

  deleteCategory: async (id: string): Promise<Category[]> => {
    if (isSupabaseConfigured()) {
      try {
        await db().from('categories').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase deleteCategory exception:', err);
      }
    }

    const current = await ServerStorage.getAllCategories();
    const filtered = current.filter((c) => c.id !== id);
    memoryCategories = filtered;
    writeJsonFile(CATEGORIES_FILE, filtered);
    return filtered;
  },

  // Search Queries
  recordSearch: async (queryText: string): Promise<void> => {
    const clean = queryText.trim();
    if (!clean || clean.length < 2) return;

    if (isSupabaseConfigured()) {
      try {
        const id = `q_${clean.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const { data: existing } = await db().from('search_queries').select('*').eq('id', id).maybeSingle();
        if (existing) {
          await db().from('search_queries').update({
            count: (existing.count || 1) + 1,
            last_searched_at: new Date().toISOString(),
          }).eq('id', id);
        } else {
          await db().from('search_queries').insert({
            id,
            query: clean,
            count: 1,
            last_searched_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('Supabase recordSearch error:', e);
      }
    }

    if (memorySearchQueries === null) {
      memorySearchQueries = readJsonFile<SearchQueryItem[]>(SEARCH_QUERIES_FILE, []);
    }
    const existing = memorySearchQueries.find((q) => q.query.toLowerCase() === clean.toLowerCase());
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.lastSearched = Date.now();
    } else {
      memorySearchQueries.push({
        query: clean,
        count: 1,
        lastSearched: Date.now(),
      });
    }
    writeJsonFile(SEARCH_QUERIES_FILE, memorySearchQueries);
  },

  recordSearchQuery: async (queryText: string): Promise<void> => {
    return await ServerStorage.recordSearch(queryText);
  },

  getTopSearchQueries: async (limitCount = 12): Promise<SearchQueryItem[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db()
          .from('search_queries')
          .select('*')
          .order('count', { ascending: false })
          .limit(limitCount);
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            query: d.query,
            count: d.count,
            lastSearched: new Date(d.last_searched_at || Date.now()).getTime(),
          }));
        }
      } catch (e) {
        console.warn('Supabase getTopSearchQueries error:', e);
      }
    }

    if (memorySearchQueries === null) {
      memorySearchQueries = readJsonFile<SearchQueryItem[]>(SEARCH_QUERIES_FILE, []);
    }
    if (memorySearchQueries && memorySearchQueries.length > 0) {
      return [...memorySearchQueries]
        .sort((a, b) => b.count - a.count)
        .slice(0, limitCount);
    }

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

    return defaultQueries.slice(0, limitCount);
  },

  // Settings
  getSettings: async (): Promise<SiteSettings> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db().from('settings').select('*').eq('id', 'general_settings').maybeSingle();
        if (!error && data) {
          const settingsPayload = (data.data && typeof data.data === 'object') ? data.data : data;
          memorySettings = { ...INITIAL_SETTINGS, ...settingsPayload };
          writeJsonFile(SETTINGS_FILE, memorySettings);
          return memorySettings as SiteSettings;
        }
      } catch (err) {
        console.warn('Supabase getSettings fallback:', err);
      }
    }

    if (memorySettings === null) {
      memorySettings = readJsonFile<SiteSettings>(SETTINGS_FILE, INITIAL_SETTINGS);
    }
    return (memorySettings || INITIAL_SETTINGS) as SiteSettings;
  },

  saveSettings: async (newSettings: Partial<SiteSettings>): Promise<SiteSettings> => {
    const current = await ServerStorage.getSettings();
    const updated = { ...current, ...newSettings };

    if (isSupabaseConfigured()) {
      try {
        await db().from('settings').upsert({
          id: 'general_settings',
          data: updated,
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase saveSettings exception:', err);
      }
    }

    memorySettings = updated;
    writeJsonFile(SETTINGS_FILE, updated);
    return updated;
  },

  // Tags
  getAllTags: async (): Promise<string[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db().from('tags').select('*').eq('id', 'all_tags').maybeSingle();
        if (!error && data && Array.isArray(data.tags)) {
          const cleaned = cleanTagsArray(data.tags);
          memoryTags = cleaned;
          writeJsonFile(TAGS_FILE, cleaned);
          return cleaned;
        }
      } catch (err) {
        console.warn('Supabase getAllTags fallback:', err);
      }
    }

    if (memoryTags === null) {
      const raw = readJsonFile<string[]>(TAGS_FILE, DEFAULT_TAGS);
      memoryTags = cleanTagsArray(raw);
    }
    return cleanTagsArray(memoryTags);
  },

  addTag: async (tag: string): Promise<string[]> => {
    const canonical = canonicalizeTag(tag);
    if (!canonical) return ServerStorage.getAllTags();
    const current = await ServerStorage.getAllTags();
    const updated = cleanTagsArray([canonical, ...current]);

    if (isSupabaseConfigured()) {
      try {
        await db().from('tags').upsert({
          id: 'all_tags',
          tags: updated,
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase addTag exception:', err);
      }
    }

    memoryTags = updated;
    writeJsonFile(TAGS_FILE, updated);
    return updated;
  },

  deleteTag: async (tag: string): Promise<string[]> => {
    const current = await ServerStorage.getAllTags();
    const targetCanonical = canonicalizeTag(tag);
    const filtered = current.filter(
      (t) => t.toLowerCase() !== tag.toLowerCase() && t.toLowerCase() !== targetCanonical.toLowerCase()
    );

    if (isSupabaseConfigured()) {
      try {
        await db().from('tags').upsert({
          id: 'all_tags',
          tags: filtered,
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase deleteTag exception:', err);
      }
    }

    memoryTags = filtered;
    writeJsonFile(TAGS_FILE, filtered);
    return filtered;
  },

  // Prompt Requests (User-submitted custom prompt requests)
  getAllPromptRequests: async (): Promise<PromptRequestItem[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await db()
          .from('prompt_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const mapped: PromptRequestItem[] = data.map((d: any) => ({
            id: d.id,
            userId: d.user_id || 'anonymous',
            userName: d.user_name || 'Community Creator',
            userEmail: d.user_email || undefined,
            userAvatar: d.user_avatar || undefined,
            requestText: d.request_text || d.prompt_description || '',
            category: d.category || 'Photorealistic & Portraits',
            aiTool: d.ai_tool || 'Midjourney',
            status: (d.status as 'pending' | 'in_progress' | 'completed') || 'pending',
            fulfilledPostId: d.fulfilled_post_id || undefined,
            createdAt: d.created_at ? (typeof d.created_at === 'number' ? d.created_at : new Date(d.created_at).getTime()) : Date.now(),
            likesCount: Number(d.likes_count) || 0,
          }));

          memoryPromptRequests = mapped;
          writeJsonFile(PROMPT_REQUESTS_FILE, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getAllPromptRequests notice:', err);
      }
    }

    if (memoryPromptRequests === null) {
      memoryPromptRequests = readJsonFile<PromptRequestItem[]>(PROMPT_REQUESTS_FILE, [
        {
          id: 'req_1',
          userId: 'u_mock1',
          userName: 'Alex Visuals',
          userEmail: 'alex.creator@example.com',
          userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
          requestText: 'Cinematic 8K portrait of a neon cyberpunk geisha with intricate golden kintsugi porcelain skin in rainy Shibuya alleyway',
          category: 'Photorealistic & Portraits',
          aiTool: 'Midjourney',
          status: 'completed',
          createdAt: Date.now() - 3600000 * 24,
          likesCount: 18,
        },
        {
          id: 'req_2',
          userId: 'u_mock2',
          userName: 'Elena Art',
          userEmail: 'elena.designs@gmail.com',
          userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
          requestText: 'Ethereal floating bioluminescent island with crystal waterfalls, volumetric golden hour haze, and ancient glowing runes',
          category: 'Fantasy & Concept Art',
          aiTool: 'Flux',
          status: 'pending',
          createdAt: Date.now() - 3600000 * 5,
          likesCount: 9,
        },
      ]);
    }
    return memoryPromptRequests;
  },

  savePromptRequest: async (req: Partial<PromptRequestItem> & { requestText: string }): Promise<PromptRequestItem> => {
    const current = await ServerStorage.getAllPromptRequests();
    const id = req.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    const newRequest: PromptRequestItem = {
      id,
      userId: req.userId || 'anonymous',
      userName: req.userName || 'Community Creator',
      userEmail: req.userEmail || '',
      userAvatar: req.userAvatar || undefined,
      requestText: req.requestText,
      category: req.category || 'Photorealistic & Portraits',
      aiTool: req.aiTool || 'Midjourney',
      status: req.status || 'pending',
      fulfilledPostId: req.fulfilledPostId || undefined,
      createdAt: req.createdAt || now,
      likesCount: req.likesCount || 0,
    };

    if (isSupabaseConfigured()) {
      try {
        await db().from('prompt_requests').upsert({
          id: newRequest.id,
          user_id: newRequest.userId,
          user_name: newRequest.userName,
          user_email: newRequest.userEmail,
          user_avatar: newRequest.userAvatar,
          request_text: newRequest.requestText,
          category: newRequest.category,
          ai_tool: newRequest.aiTool,
          status: newRequest.status,
          fulfilled_post_id: newRequest.fulfilledPostId,
          created_at: new Date(newRequest.createdAt).toISOString(),
          likes_count: newRequest.likesCount,
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase savePromptRequest fallback:', err);
      }
    }

    const filtered = current.filter((r) => r.id !== id);
    const updated = [newRequest, ...filtered];
    memoryPromptRequests = updated;
    writeJsonFile(PROMPT_REQUESTS_FILE, updated);
    return newRequest;
  },

  updatePromptRequestStatus: async (id: string, status: 'pending' | 'in_progress' | 'completed', fulfilledPostId?: string): Promise<PromptRequestItem[]> => {
    const current = await ServerStorage.getAllPromptRequests();
    const target = current.find((r) => r.id === id);
    if (!target) return current;

    const updatedItem: PromptRequestItem = {
      ...target,
      status,
      fulfilledPostId: fulfilledPostId !== undefined ? fulfilledPostId : target.fulfilledPostId,
    };

    if (isSupabaseConfigured()) {
      try {
        await db().from('prompt_requests').update({
          status,
          fulfilled_post_id: updatedItem.fulfilledPostId || null,
        }).eq('id', id);
      } catch (err) {
        console.warn('Supabase updatePromptRequestStatus exception:', err);
      }
    }

    const updatedList = current.map((r) => (r.id === id ? updatedItem : r));
    memoryPromptRequests = updatedList;
    writeJsonFile(PROMPT_REQUESTS_FILE, updatedList);
    return updatedList;
  },

  deletePromptRequest: async (id: string): Promise<PromptRequestItem[]> => {
    const current = await ServerStorage.getAllPromptRequests();
    const filtered = current.filter((r) => r.id !== id);

    if (isSupabaseConfigured()) {
      try {
        await db().from('prompt_requests').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deletePromptRequest exception:', err);
      }
    }

    memoryPromptRequests = filtered;
    writeJsonFile(PROMPT_REQUESTS_FILE, filtered);
    return filtered;
  },
};
