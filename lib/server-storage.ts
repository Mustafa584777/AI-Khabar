import { Category, PromptPost, SiteSettings, SearchQueryItem, PlanTier } from '@/types/prompt';
import { INITIAL_CATEGORIES, INITIAL_SETTINGS, INITIAL_POSTS } from './initial-data';
import { db as firestoreDb, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { cleanTagsArray, canonicalizeTag } from './tag-utils';
import { uploadImageToCloudinary } from './cloudinary-server';
import { PLAN_CONFIGS } from './plans';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const SEARCH_QUERIES_FILE = path.join(DATA_DIR, 'search_queries.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const USER_PROFILES_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const DELETED_POSTS_FILE = path.join(DATA_DIR, 'deleted_posts.json');

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

let memoryDeletedIds: Set<string> | null = null;

function getDeletedPostIds(): Set<string> {
  if (memoryDeletedIds) return memoryDeletedIds;
  const localList = readJsonFile<string[]>(DELETED_POSTS_FILE, []);
  const set = new Set<string>(Array.isArray(localList) ? localList : []);
  memoryDeletedIds = set;
  return set;
}

function recordDeletedPostIds(ids: string[]): void {
  const current = getDeletedPostIds();
  ids.forEach((id) => {
    if (id) current.add(id);
  });
  memoryDeletedIds = current;
  const list = Array.from(current);
  writeJsonFile(DELETED_POSTS_FILE, list);

  if (isFirebaseConfigured()) {
    setDoc(
      doc(firestoreDb, 'settings', 'deleted_posts'),
      {
        ids: list,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((e) => console.error('Firestore recordDeletedPostIds error:', e));
  }
}

function unrecordDeletedPostId(id: string): void {
  const current = getDeletedPostIds();
  if (current.has(id)) {
    current.delete(id);
    memoryDeletedIds = current;
    const list = Array.from(current);
    writeJsonFile(DELETED_POSTS_FILE, list);

    if (isFirebaseConfigured()) {
      setDoc(
        doc(firestoreDb, 'settings', 'deleted_posts'),
        {
          ids: list,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((e) => console.error('Firestore unrecordDeletedPostId error:', e));
    }
  }
}

// Helper to remove any undefined fields before sending to Firestore
function cleanForFirestore<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return null as any;
  if (Array.isArray(obj)) return obj.map((item) => cleanForFirestore(item)) as any;
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res as any;
  }
  return obj;
}

// In-memory runtime cache with 24-hour TTL
let memoryPosts: PromptPost[] | null = null;
let memoryPostsTimestamp = 0;
const POSTS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let memoryCategories: Category[] | null = null;
let memorySettings: SiteSettings | null = null;
let memoryTags: string[] | null = null;
let memorySearchQueries: SearchQueryItem[] | null = null;

export const ServerStorage = {
  // Posts
  getAllPosts: async (includeDrafts = true): Promise<PromptPost[]> => {
    const deletedIds = getDeletedPostIds();
    const now = Date.now();
    if (memoryPosts && memoryPosts.length > 0 && (now - memoryPostsTimestamp < POSTS_CACHE_TTL)) {
      const valid = memoryPosts.filter((p) => !deletedIds.has(p.id));
      return includeDrafts ? valid : valid.filter((p) => p.status === 'published');
    }

    let localPosts: PromptPost[] = [];
    try {
      const rawPosts = readJsonFile<PromptPost[]>(POSTS_FILE, INITIAL_POSTS || []);
      localPosts = rawPosts.map((p) => ({
        ...p,
        tags: cleanTagsArray(p.tags || []),
      }));
    } catch {
      localPosts = INITIAL_POSTS || [];
    }

    let remotePosts: PromptPost[] = [];
    if (isFirebaseConfigured()) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'posts'));
        if (!snap.empty) {
          snap.forEach((d) => {
            const data = d.data() as PromptPost;
            if (data && data.id) {
              remotePosts.push({
                ...data,
                tags: cleanTagsArray(data.tags || []),
              });
            }
          });
        }
      } catch (err) {
        console.warn('Firestore getAllPosts fallback:', err);
      }
    }

    // Merge remotePosts and localPosts by ID to ensure NO prompt is ever lost
    const postMap = new Map<string, PromptPost>();
    for (const p of localPosts) {
      if (p.id && !deletedIds.has(p.id)) postMap.set(p.id, p);
    }
    for (const p of remotePosts) {
      if (p.id && !deletedIds.has(p.id)) {
        const existing = postMap.get(p.id);
        if (
          !existing ||
          new Date(p.updatedAt || p.createdAt || 0).getTime() >=
            new Date(existing.updatedAt || existing.createdAt || 0).getTime()
        ) {
          postMap.set(p.id, p);
        }
      }
    }

    const merged = Array.from(postMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    memoryPosts = merged;
    memoryPostsTimestamp = Date.now();
    writeJsonFile(POSTS_FILE, merged);

    return includeDrafts ? merged : merged.filter((p) => p.status === 'published');
  },

  getPostBySlug: async (slug: string): Promise<PromptPost | undefined> => {
    const posts = await ServerStorage.getAllPosts(true);
    const targetSlug = slug.toLowerCase().trim();
    return posts.find((p) => {
      if (p.slug && p.slug.toLowerCase() === targetSlug) return true;
      if (p.id && p.id.toLowerCase() === targetSlug) return true;
      if (p.title) {
        const titleSlug = p.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        if (titleSlug === targetSlug) return true;
      }
      return false;
    });
  },

  getPostById: async (id: string): Promise<PromptPost | undefined> => {
    const posts = await ServerStorage.getAllPosts(true);
    return posts.find((p) => p.id === id);
  },

  savePost: async (post: PromptPost, token?: string): Promise<PromptPost> => {
    const now = new Date().toISOString();
    const id = post.id || `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const posts = readJsonFile<PromptPost[]>(POSTS_FILE, INITIAL_POSTS || []);
    const existing = posts.find((p) => p.id === id);

    const isPremium = Boolean(
      post.isPremium !== undefined
        ? post.isPremium
        : post.parameters?.isPremium ?? existing?.isPremium ?? existing?.parameters?.isPremium
    );

    const mergedParameters = {
      ...(existing?.parameters || {}),
      ...(post.parameters || {}),
      isPremium,
    };

    const defaultViews =
      post.viewsCount !== undefined ? post.viewsCount : (existing?.viewsCount ?? Math.floor(Math.random() * 50) + 10);
    const defaultCopies =
      post.copiesCount !== undefined ? post.copiesCount : (existing?.copiesCount ?? Math.floor(Math.random() * 20) + 2);
    const defaultLikes =
      post.likesCount !== undefined ? post.likesCount : (existing?.likesCount ?? Math.floor(Math.random() * 15) + 1);

    const safeTitle = post.title?.trim() || existing?.title || 'Untitled Prompt';
    const autoSlug =
      post.slug ||
      existing?.slug ||
      safeTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') ||
      `prompt-${Date.now()}`;

    const savedPost: PromptPost = {
      ...existing,
      ...post,
      id,
      title: safeTitle,
      slug: autoSlug,
      promptText: post.promptText || existing?.promptText || '',
      negativePrompt: post.negativePrompt || existing?.negativePrompt,
      category: post.category || existing?.category || 'General',
      aiTool: post.aiTool || existing?.aiTool || 'Midjourney',
      imageUrl: post.imageUrl || existing?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      imageAlt: post.imageAlt || existing?.imageAlt || safeTitle,
      imageWidth: post.imageWidth || existing?.imageWidth || 1024,
      imageHeight: post.imageHeight || existing?.imageHeight || 1536,
      additionalImages: Array.isArray(post.additionalImages) ? post.additionalImages : (existing?.additionalImages || []),
      isPremium,
      parameters: mergedParameters,
      tags: cleanTagsArray(post.tags || existing?.tags || ['AI Prompt']),
      author: post.author || existing?.author || {
        name: 'tool.reelz',
        avatar: '/logo.png',
        role: 'Author',
      },
      createdAt: post.createdAt || existing?.createdAt || now,
      updatedAt: now,
      publishedAt: post.status === 'published' ? post.publishedAt || existing?.publishedAt || now : undefined,
      viewsCount: defaultViews,
      copiesCount: defaultCopies,
      likesCount: defaultLikes,
      bookmarksCount: post.bookmarksCount !== undefined ? post.bookmarksCount : (existing?.bookmarksCount || 0),
    };

    // If image is a local base64 data URI, auto-upload to Cloudinary or save to public/images/prompts
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

    // Update memory and local cache immediately
    unrecordDeletedPostId(savedPost.id);
    const currentList = memoryPosts && memoryPosts.length > 0
      ? [...memoryPosts]
      : readJsonFile<PromptPost[]>(POSTS_FILE, INITIAL_POSTS || []);
    const index = currentList.findIndex((p) => p.id === id);
    if (index >= 0) {
      currentList[index] = savedPost;
    } else {
      currentList.unshift(savedPost);
    }
    memoryPosts = currentList;
    memoryPostsTimestamp = Date.now();
    writeJsonFile(POSTS_FILE, currentList);

    // Save to Firebase Firestore in background (non-blocking)
    if (isFirebaseConfigured()) {
      setDoc(doc(firestoreDb, 'posts', savedPost.id), cleanForFirestore(savedPost))
        .catch((fErr) => console.error('Firestore background savePost error:', fErr));
    }

    // Auto-create category if needed
    if (savedPost.category && savedPost.category.trim()) {
      try {
        const catName = savedPost.category.trim();
        const existingCats = await ServerStorage.getAllCategories();
        const exists = existingCats.some((c) => c.name.toLowerCase() === catName.toLowerCase());

        if (!exists) {
          const cleanSlug =
            catName
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

  deletePost: async (id: string, token?: string): Promise<void> => {
    return ServerStorage.deletePosts([id], token);
  },

  deletePosts: async (ids: string[], token?: string): Promise<void> => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const cleanIds = ids.filter(Boolean);
    if (cleanIds.length === 0) return;
    const idSet = new Set(cleanIds);

    await recordDeletedPostIds(cleanIds);

    // 1. Remove from local file / memory
    try {
      const rawPosts = memoryPosts && memoryPosts.length > 0
        ? [...memoryPosts]
        : readJsonFile<PromptPost[]>(POSTS_FILE, []);
      const filteredLocal = rawPosts.filter((p) => !idSet.has(p.id));
      memoryPosts = filteredLocal;
      memoryPostsTimestamp = Date.now();
      writeJsonFile(POSTS_FILE, filteredLocal);
    } catch (e) {
      console.error('Local deletePosts error:', e);
    }

    // 2. Remove from Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        const batch = writeBatch(firestoreDb);
        let batchCount = 0;
        for (const id of cleanIds) {
          batch.delete(doc(firestoreDb, 'posts', id));
          batchCount++;
          if (batchCount >= 450) break;
        }
        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error('Firestore deletePosts error:', err);
      }
    }
  },

  restorePosts: async (incomingPosts: PromptPost[], mode: 'replace' | 'merge'): Promise<PromptPost[]> => {
    const now = new Date().toISOString();

    // Clean and validate incoming posts
    const cleanIncoming = incomingPosts.map((p, idx) => {
      const id = p.id || `prompt-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const title = p.title?.trim() || `Prompt #${idx + 1}`;
      const slug =
        p.slug ||
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') ||
        `prompt-${Date.now()}-${idx}`;
      return {
        ...p,
        id,
        title,
        slug,
        promptText: p.promptText || title,
        category: p.category || 'General',
        aiTool: p.aiTool || 'Midjourney',
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
        tags: cleanTagsArray(p.tags || ['AI Prompt']),
        status: p.status === 'draft' ? ('draft' as const) : ('published' as const),
        viewsCount: Number(p.viewsCount) || 0,
        copiesCount: Number(p.copiesCount) || 0,
        likesCount: Number(p.likesCount) || 0,
        createdAt: p.createdAt || now,
        updatedAt: now,
      };
    });

    let finalList: PromptPost[] = [];

    if (mode === 'replace') {
      finalList = cleanIncoming;
      memoryPosts = cleanIncoming;
      writeJsonFile(POSTS_FILE, cleanIncoming);

      // If replacing in Firestore, delete old docs
      if (isFirebaseConfigured()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'posts'));
          const batch = writeBatch(firestoreDb);
          let count = 0;
          for (const d of snap.docs) {
            batch.delete(d.ref);
            count++;
            if (count >= 400) break;
          }
          if (count > 0) await batch.commit();
        } catch (e) {
          console.warn('Firestore clear posts notice:', e);
        }
      }
    } else {
      // Merge mode: combine existing + incoming by ID
      const existing = readJsonFile<PromptPost[]>(POSTS_FILE, []);
      const map = new Map<string, PromptPost>();
      for (const p of existing) {
        if (p.id) map.set(p.id, p);
      }
      for (const p of cleanIncoming) {
        if (p.id) map.set(p.id, p);
      }
      finalList = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      memoryPosts = finalList;
      writeJsonFile(POSTS_FILE, finalList);
    }

    // Batch write to Firebase Firestore
    if (isFirebaseConfigured() && cleanIncoming.length > 0) {
      try {
        const chunkSize = 250;
        for (let i = 0; i < cleanIncoming.length; i += chunkSize) {
          const chunk = cleanIncoming.slice(i, i + chunkSize);
          const batch = writeBatch(firestoreDb);
          for (const post of chunk) {
            batch.set(doc(firestoreDb, 'posts', post.id), cleanForFirestore(post));
          }
          await batch.commit();
        }
      } catch (err) {
        console.error('Firestore batch restorePosts error:', err);
      }
    }

    return finalList;
  },

  incrementViews: async (id: string, token?: string): Promise<void> => {
    // Views tracking removed to eliminate writes and reads
    return;
  },

  incrementCopies: async (id: string, token?: string): Promise<void> => {
    if (memoryPosts) {
      const p = memoryPosts.find((x) => x.id === id);
      if (p) p.copiesCount = (p.copiesCount || 0) + 1;
    }
    try {
      const rawPosts = readJsonFile<PromptPost[]>(POSTS_FILE, []);
      const p = rawPosts.find((x) => x.id === id);
      if (p) {
        p.copiesCount = (p.copiesCount || 0) + 1;
        writeJsonFile(POSTS_FILE, rawPosts);
      }
    } catch {}
  },

  incrementCopyCount: async (id: string, token?: string): Promise<void> => {
    return await ServerStorage.incrementCopies(id, token);
  },

  incrementViewCount: async (id: string, token?: string): Promise<void> => {
    // Views tracking removed to eliminate writes and reads
    return;
  },

  toggleLike: async (id: string, token?: string): Promise<void> => {
    // Likes system removed
    return;
  },

  // Categories
  getAllCategories: async (): Promise<Category[]> => {
    if (memoryCategories && memoryCategories.length > 0) {
      return memoryCategories;
    }

    const initial = INITIAL_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i }));
    let localCats: Category[] = [];
    try {
      localCats = readJsonFile<Category[]>(CATEGORIES_FILE, initial);
    } catch {
      localCats = initial;
    }

    let remoteCats: Category[] = [];
    if (isFirebaseConfigured()) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'categories'));
        if (!snap.empty) {
          snap.forEach((d) => {
            const data = d.data() as Category;
            if (data && data.name) {
              remoteCats.push(data);
            }
          });
        }
      } catch (err) {
        console.warn('Firestore getAllCategories notice:', err);
      }
    }

    const catMap = new Map<string, Category>();
    for (const c of localCats) {
      if (c.name) catMap.set(c.name.toLowerCase(), c);
    }
    for (const c of remoteCats) {
      if (c.name) catMap.set(c.name.toLowerCase(), c);
    }

    const merged = Array.from(catMap.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    memoryCategories = merged;
    writeJsonFile(CATEGORIES_FILE, merged);

    return merged;
  },

  saveCategory: async (category: Category): Promise<Category> => {
    const id = category.id || `cat-${Date.now()}`;
    const cleanSlug =
      category.slug ||
      category.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      `cat-${Date.now()}`;

    const savedCat: Category = {
      ...category,
      id,
      slug: cleanSlug,
    };

    // 1. Local file
    const currentCats = await ServerStorage.getAllCategories();
    const index = currentCats.findIndex((c) => c.id === id || c.name.toLowerCase() === savedCat.name.toLowerCase());
    if (index >= 0) {
      currentCats[index] = savedCat;
    } else {
      currentCats.push(savedCat);
    }
    memoryCategories = currentCats;
    writeJsonFile(CATEGORIES_FILE, currentCats);

    // 2. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'categories', savedCat.id), cleanForFirestore(savedCat));
      } catch (err) {
        console.error('Firestore saveCategory error:', err);
      }
    }

    return savedCat;
  },

  deleteCategory: async (id: string): Promise<boolean> => {
    // 1. Local
    const current = await ServerStorage.getAllCategories();
    const filtered = current.filter((c) => c.id !== id);
    memoryCategories = filtered;
    writeJsonFile(CATEGORIES_FILE, filtered);

    // 2. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        await deleteDoc(doc(firestoreDb, 'categories', id));
      } catch (err) {
        console.error('Firestore deleteCategory error:', err);
      }
    }
    return true;
  },

  // Site Settings
  getSettings: async (): Promise<SiteSettings> => {
    let local = readJsonFile<SiteSettings>(SETTINGS_FILE, INITIAL_SETTINGS);

    if (isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'settings', 'site_settings'));
        if (snap.exists()) {
          const remote = snap.data() as SiteSettings;
          local = { ...local, ...remote };
        }
      } catch (err) {
        console.warn('Firestore getSettings notice:', err);
      }
    }

    memorySettings = local;
    return local;
  },

  saveSettings: async (settings: Partial<SiteSettings>): Promise<SiteSettings> => {
    const current = await ServerStorage.getSettings();
    const merged: SiteSettings = {
      ...current,
      ...settings,
    };

    // 1. Local file
    memorySettings = merged;
    writeJsonFile(SETTINGS_FILE, merged);

    // 2. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'site_settings'), cleanForFirestore(merged));
      } catch (err) {
        console.error('Firestore saveSettings error:', err);
      }
    }

    return merged;
  },

  // Tags
  getAllTags: async (): Promise<string[]> => {
    let local = readJsonFile<string[]>(TAGS_FILE, DEFAULT_TAGS);

    if (isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'settings', 'all_tags'));
        if (snap.exists() && Array.isArray(snap.data()?.tags)) {
          const remoteTags = snap.data()?.tags as string[];
          local = Array.from(new Set([...local, ...remoteTags]));
        }
      } catch (err) {
        console.warn('Firestore getAllTags notice:', err);
      }
    }

    const clean = cleanTagsArray(local);
    memoryTags = clean;
    writeJsonFile(TAGS_FILE, clean);
    return clean;
  },

  saveTag: async (tag: string): Promise<string[]> => {
    const current = await ServerStorage.getAllTags();
    const cleanTag = tag.trim();
    if (!cleanTag) return current;

    const exists = current.some((t) => t.toLowerCase() === cleanTag.toLowerCase());
    if (exists) return current;

    const updated = [cleanTag, ...current];
    const cleaned = cleanTagsArray(updated);

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'all_tags'), { tags: cleaned, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Firestore saveTag error:', err);
      }
    }

    memoryTags = cleaned;
    writeJsonFile(TAGS_FILE, cleaned);
    return cleaned;
  },

  deleteTag: async (tag: string): Promise<string[]> => {
    const current = await ServerStorage.getAllTags();
    const targetCanonical = canonicalizeTag(tag);
    const filtered = current.filter(
      (t) => t.toLowerCase() !== tag.toLowerCase() && t.toLowerCase() !== targetCanonical.toLowerCase()
    );

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'all_tags'), { tags: filtered, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Firestore deleteTag error:', err);
      }
    }

    memoryTags = filtered;
    writeJsonFile(TAGS_FILE, filtered);
    return filtered;
  },

  saveAllTags: async (tags: string[]): Promise<string[]> => {
    const cleaned = cleanTagsArray(tags);
    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'all_tags'), { tags: cleaned, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Firestore saveAllTags error:', err);
      }
    }
    memoryTags = cleaned;
    writeJsonFile(TAGS_FILE, cleaned);
    return cleaned;
  },

  addTag: async (tag: string): Promise<string[]> => {
    return ServerStorage.saveTag(tag);
  },

  // Search Queries
  getAllSearchQueries: async (limitCount = 50): Promise<SearchQueryItem[]> => {
    return ServerStorage.getSearchQueries(limitCount);
  },

  getTopSearchQueries: async (limitCount = 50): Promise<SearchQueryItem[]> => {
    return ServerStorage.getSearchQueries(limitCount);
  },

  deleteSearchQuery: async (queryText: string): Promise<SearchQueryItem[]> => {
    const current = await ServerStorage.getSearchQueries(100);
    const filtered = current.filter((q) => q.query.toLowerCase() !== queryText.toLowerCase());
    await ServerStorage.restoreSearchQueries(filtered);
    return filtered;
  },
  getSearchQueries: async (limitCount = 50): Promise<SearchQueryItem[]> => {
    let local = readJsonFile<SearchQueryItem[]>(SEARCH_QUERIES_FILE, []);

    if (isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'settings', 'search_queries'));
        if (snap.exists() && Array.isArray(snap.data()?.queries)) {
          const remote = snap.data()?.queries as SearchQueryItem[];
          const map = new Map<string, SearchQueryItem>();
          for (const q of local) if (q.id) map.set(q.id, q);
          for (const q of remote) if (q.id) map.set(q.id, q);
          local = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        }
      } catch (err) {
        console.warn('Firestore getSearchQueries notice:', err);
      }
    }

    memorySearchQueries = local;
    return local.slice(0, limitCount);
  },

  recordSearchQuery: async (queryText: string, resultsCount: number, category = 'all'): Promise<void> => {
    const cleanText = (queryText || '').trim();
    if (!cleanText || cleanText.length < 2) return;

    const current = await ServerStorage.getSearchQueries(100);
    const existingIdx = current.findIndex((q) => q.query.toLowerCase() === cleanText.toLowerCase());

    const now = new Date().toISOString();
    let updated: SearchQueryItem[] = [];

    if (existingIdx >= 0) {
      const item = { ...current[existingIdx] };
      item.count = (item.count || 1) + 1;
      item.resultsCount = resultsCount;
      item.createdAt = now;
      item.lastSearched = Date.now();
      updated = [item, ...current.filter((_, i) => i !== existingIdx)];
    } else {
      const newItem: SearchQueryItem = {
        id: `sq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        query: cleanText,
        count: 1,
        resultsCount,
        category,
        createdAt: now,
        lastSearched: Date.now(),
      };
      updated = [newItem, ...current].slice(0, 100);
    }

    memorySearchQueries = updated;
    writeJsonFile(SEARCH_QUERIES_FILE, updated);
  },

  clearAllSearchQueries: async (): Promise<void> => {
    memorySearchQueries = [];
    writeJsonFile(SEARCH_QUERIES_FILE, []);

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'search_queries'), { queries: [], updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Firestore clearAllSearchQueries error:', err);
      }
    }
  },

  restoreSearchQueries: async (queries: SearchQueryItem[]): Promise<void> => {
    if (!Array.isArray(queries) || queries.length === 0) return;
    const cleanList = queries
      .filter((q) => q && typeof q.query === 'string' && q.query.trim().length > 0)
      .map((q, idx) => ({
        id: q.id || `sq_${Date.now()}_${idx}`,
        query: q.query.trim(),
        count: Number(q.count) || 1,
        resultsCount: Number(q.resultsCount) || 0,
        category: q.category || 'all',
        createdAt: q.createdAt || new Date().toISOString(),
        lastSearched: Number(q.lastSearched) || Date.now(),
      }));

    memorySearchQueries = cleanList;
    writeJsonFile(SEARCH_QUERIES_FILE, cleanList);

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'search_queries'), { queries: cleanList, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Firestore restoreSearchQueries error:', err);
      }
    }
  },

  // Subscriptions & Memberships
  getUserSubscription: async (email: string): Promise<any | null> => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) return null;
    const cleanKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');

    // 1. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'subscriptions', cleanKey));
        if (snap.exists()) {
          const sub = snap.data();
          if (sub && sub.planExpiresAt && new Date(sub.planExpiresAt).getTime() < Date.now()) {
            if (sub.queuedPlan) {
              const qp = sub.queuedPlan;
              const qpCfg = PLAN_CONFIGS[qp.planTier as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.pro;
              sub.planTier = qp.planTier;
              sub.status = 'active';
              sub.isProUser = true;
              sub.planStartedAt = qp.scheduledStartAt || new Date().toISOString();
              sub.planExpiresAt = qp.scheduledExpiresAt;
              sub.credits = qp.credits || qpCfg.credits;
              sub.promptRequests = qp.promptRequests || qpCfg.promptRequests;
              sub.aiSearchQuota = qp.aiSearchQuota || qpCfg.aiSearchQuota;
              sub.queuedPlan = null;
              void ServerStorage.saveUserSubscription(sub);
            } else {
              sub.status = 'expired';
            }
          }
          return sub;
        }
      } catch (err) {
        console.warn('Firestore getUserSubscription notice:', err);
      }
    }

    // 2. Local file fallback
    const allSubs = readJsonFile<Record<string, any>>(SUBSCRIPTIONS_FILE, {});
    const localSub = allSubs[cleanEmail] || allSubs[cleanKey] || null;
    if (localSub) {
      if (localSub.planExpiresAt && new Date(localSub.planExpiresAt).getTime() < Date.now()) {
        if (localSub.queuedPlan) {
          const qp = localSub.queuedPlan;
          const qpCfg = PLAN_CONFIGS[qp.planTier as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.pro;
          localSub.planTier = qp.planTier;
          localSub.status = 'active';
          localSub.isProUser = true;
          localSub.planStartedAt = qp.scheduledStartAt || new Date().toISOString();
          localSub.planExpiresAt = qp.scheduledExpiresAt;
          localSub.credits = qp.credits || qpCfg.credits;
          localSub.promptRequests = qp.promptRequests || qpCfg.promptRequests;
          localSub.aiSearchQuota = qp.aiSearchQuota || qpCfg.aiSearchQuota;
          localSub.queuedPlan = null;
          void ServerStorage.saveUserSubscription(localSub);
        } else {
          localSub.status = 'expired';
        }
      }
      return localSub;
    }

    return null;
  },

  saveUserSubscription: async (sub: any): Promise<any> => {
    const cleanEmail = sub.email ? sub.email.trim().toLowerCase() : '';
    if (!cleanEmail) return sub;
    const cleanKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');

    const enriched = {
      ...sub,
      email: cleanEmail,
      updatedAt: new Date().toISOString(),
    };

    // 1. Local file
    try {
      const allSubs = readJsonFile<Record<string, any>>(SUBSCRIPTIONS_FILE, {});
      allSubs[cleanEmail] = enriched;
      writeJsonFile(SUBSCRIPTIONS_FILE, allSubs);
    } catch (e) {
      console.error('Error writing subscriptions.json:', e);
    }

    // 2. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'subscriptions', cleanKey), cleanForFirestore(enriched));
      } catch (err) {
        console.error('Firestore saveUserSubscription error:', err);
      }
    }

    return enriched;
  },

  saveOrder: async (order: any): Promise<void> => {
    if (!order) return;
    const orderId = order.orderId || order.order_id || `order_${Date.now()}`;
    const cleanId = String(orderId).replace(/[^a-z0-9_]/g, '_');

    // 1. Local file
    try {
      const allOrders = readJsonFile<Record<string, any>>(ORDERS_FILE, {});
      allOrders[cleanId] = { ...order, updatedAt: new Date().toISOString() };
      writeJsonFile(ORDERS_FILE, allOrders);
    } catch (e) {
      console.error('Error writing orders.json:', e);
    }

    // 2. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(firestoreDb, 'orders', cleanId), cleanForFirestore(order));
      } catch (err) {
        console.error('Firestore saveOrder error:', err);
      }
    }
  },

  getUserProfile: async (email: string, userId?: string): Promise<any | null> => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail && !userId) return null;
    const cleanKey = cleanEmail ? cleanEmail.replace(/[^a-z0-9_]/g, '_') : '';
    const candidates: any[] = [];

    // 1. Firebase Firestore check
    if (isFirebaseConfigured()) {
      try {
        if (cleanKey) {
          const snap = await getDoc(doc(firestoreDb, 'users', cleanKey));
          if (snap.exists()) candidates.push(snap.data());
        }
        if (userId && userId !== cleanKey) {
          const snap = await getDoc(doc(firestoreDb, 'users', userId));
          if (snap.exists()) candidates.push(snap.data());
        }
      } catch (err) {
        console.warn('Firestore getUserProfile notice:', err);
      }
    }

    // 2. Local file check
    try {
      const allUsers = readJsonFile<Record<string, any>>(USER_PROFILES_FILE, {});
      if (cleanEmail && allUsers[cleanEmail]) {
        candidates.push(allUsers[cleanEmail]);
      }
      if (userId && allUsers[userId]) {
        candidates.push(allUsers[userId]);
      }
    } catch (e) {
      console.error('Error reading users.json:', e);
    }

    // 3. Subscription check
    const sub = await ServerStorage.getUserSubscription(cleanEmail);
    const hasActiveSub = Boolean(
      sub &&
      sub.status === 'active' &&
      (!sub.planExpiresAt || new Date(sub.planExpiresAt).getTime() > Date.now())
    );

    if (candidates.length === 0) {
      if (hasActiveSub) {
        return {
          email: cleanEmail,
          userId,
          planTier: sub.planTier,
          isProUser: true,
          toolCredits: sub.credits,
          aiSearchRemaining: sub.aiSearchQuota,
          promptRequestsRemaining: sub.promptRequests,
          planStartedAt: sub.planStartedAt,
          planExpiresAt: sub.planExpiresAt,
          bookmarkedIds: [],
          likedIds: [],
          unlockedPromptIds: [],
          aiHistory: [],
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }

    candidates.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };

    let highestTier = hasActiveSub ? sub.planTier : 'free';
    let highestStartedAt = hasActiveSub ? sub.planStartedAt : undefined;
    let highestExpiresAt = hasActiveSub ? sub.planExpiresAt : undefined;

    for (const curr of candidates) {
      const hasPaymentProof = Boolean(
        curr.lastPaymentId ||
        curr.paymentId ||
        curr.lastOrderId ||
        curr.source === 'razorpay_verified'
      );
      const hasValidExpiry = Boolean(
        curr.planExpiresAt &&
        !isNaN(new Date(curr.planExpiresAt).getTime()) &&
        new Date(curr.planExpiresAt).getTime() > Date.now()
      );
      const hasPaidTier = Boolean(curr.planTier && curr.planTier !== 'free' && curr.planTier in PLAN_CONFIGS);
      const isPaidCandidate = hasActiveSub || hasPaymentProof || (hasPaidTier && hasValidExpiry) || (hasPaidTier && !curr.planExpiresAt);
      const currTier = isPaidCandidate ? (curr.planTier || (curr.isProUser ? 'starter' : 'free')) : 'free';

      if ((TIER_RANK[currTier] || 0) > (TIER_RANK[highestTier] || 0)) {
        highestTier = currTier;
        highestStartedAt = curr.planStartedAt || highestStartedAt;
        highestExpiresAt = curr.planExpiresAt || highestExpiresAt;
      }
    }

    const matchingCandidate =
      candidates.find((c) => {
        const t = c.planTier || (c.isProUser ? 'pro' : 'free');
        return t === highestTier;
      }) || candidates[0];

    const best = { ...matchingCandidate };

    for (const curr of candidates) {
      best.bookmarkedIds = Array.from(new Set([...(best.bookmarkedIds || []), ...(curr.bookmarkedIds || [])]));
      best.unlockedPromptIds = Array.from(new Set([...(best.unlockedPromptIds || []), ...(curr.unlockedPromptIds || [])]));
      best.likedIds = Array.from(new Set([...(best.likedIds || []), ...(curr.likedIds || [])]));
    }

    best.planTier = highestTier;
    best.isProUser = highestTier !== 'free';
    if (highestTier === 'free') {
      best.promptRequestsRemaining = 0;
    }
    best.planStartedAt = highestStartedAt || best.planStartedAt;
    best.planExpiresAt = highestExpiresAt || best.planExpiresAt;
    best.queuedPlan = sub?.queuedPlan || best.queuedPlan || null;

    if (best.planExpiresAt && new Date(best.planExpiresAt).getTime() <= Date.now() && best.queuedPlan) {
      const qp = best.queuedPlan;
      const qpCfg = PLAN_CONFIGS[qp.planTier as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.pro;
      best.planTier = qp.planTier;
      best.isProUser = true;
      best.planStartedAt = qp.scheduledStartAt || new Date().toISOString();
      best.planExpiresAt = qp.scheduledExpiresAt;
      best.toolCredits = qp.credits || qpCfg.credits;
      best.promptRequestsRemaining = qp.promptRequests || qpCfg.promptRequests;
      best.aiSearchRemaining = qpCfg.unlimitedSearches ? 999999 : (qp.aiSearchQuota || qpCfg.aiSearchQuota);
      best.queuedPlan = null;
    }

    const planCfg = PLAN_CONFIGS[best.planTier as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.free;

    if (best.toolCredits === undefined || best.toolCredits === null) {
      best.toolCredits = best.planTier === 'free' ? 5 : planCfg.credits;
    } else {
      best.toolCredits = Number(best.toolCredits);
    }

    if (best.promptRequestsRemaining === undefined || best.promptRequestsRemaining === null) {
      best.promptRequestsRemaining = best.planTier !== 'free' ? planCfg.promptRequests : 0;
    } else {
      best.promptRequestsRemaining = Number(best.promptRequestsRemaining);
    }

    if (planCfg.unlimitedSearches) {
      best.aiSearchRemaining = 999999;
    } else if (best.planTier !== 'free') {
      const currentVal =
        best.aiSearchRemaining !== undefined && best.aiSearchRemaining !== null
          ? Number(best.aiSearchRemaining)
          : undefined;
      if (currentVal === undefined || isNaN(currentVal) || currentVal <= 10) {
        best.aiSearchRemaining = planCfg.aiSearchQuota;
      } else {
        best.aiSearchRemaining = Math.min(currentVal, planCfg.aiSearchQuota);
      }
    } else if (best.aiSearchRemaining === undefined || best.aiSearchRemaining === null) {
      best.aiSearchRemaining = 5;
    } else {
      best.aiSearchRemaining = Math.min(Number(best.aiSearchRemaining), 5);
    }

    return best;
  },

  saveUserProfile: async (email: string, userId: string | undefined, data: any): Promise<any> => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanKey = cleanEmail ? cleanEmail.replace(/[^a-z0-9_]/g, '_') : '';
    const docKey = userId || cleanKey || `u_${Date.now()}`;

    const payload = {
      ...data,
      email: cleanEmail || data.email,
      userId: userId || data.userId || docKey,
      updatedAt: new Date().toISOString(),
    };

    // 1. Local file
    try {
      const allUsers = readJsonFile<Record<string, any>>(USER_PROFILES_FILE, {});
      if (cleanEmail) allUsers[cleanEmail] = payload;
      if (userId) allUsers[userId] = payload;
      writeJsonFile(USER_PROFILES_FILE, allUsers);
    } catch (e) {
      console.error('Error writing users.json:', e);
    }

    // 2. Firebase Firestore
    if (isFirebaseConfigured()) {
      try {
        const primaryKey = cleanKey || docKey;
        await setDoc(doc(firestoreDb, 'users', primaryKey), cleanForFirestore(payload));
      } catch (err) {
        console.error('Firestore saveUserProfile error:', err);
      }
    }

    return payload;
  },
};
