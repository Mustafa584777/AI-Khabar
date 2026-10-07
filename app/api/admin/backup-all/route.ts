import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { NotificationServerStore } from '@/lib/notification-storage';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RegisteredUserRecord, PromptPost, Category, SearchQueryItem, PromptRequestItem, SiteSettings, PlanTier } from '@/types/prompt';
import { cleanTagsArray } from '@/lib/tag-utils';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const PROMPT_REQUESTS_KEY = 'prompt_requests';

function getCleanEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

function getSyncKey(userId?: string, email?: string): string {
  if (userId) return `user_sync_${userId}`;
  if (email) {
    const clean = email.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `user_sync_email_${clean}`;
  }
  return '';
}

function readLocalJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeLocalJson<T>(filePath: string, data: T): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`Error writing ${filePath}:`, err);
  }
}

// Fetch all registered users from DB and local files
async function fetchAllRegisteredUsers(): Promise<RegisteredUserRecord[]> {
  const client = supabaseAdmin || supabase;
  const usersMap = new Map<string, RegisteredUserRecord>();

  // 1. Fetch from Supabase settings table (user_sync_* rows)
  if (isSupabaseConfigured()) {
    try {
      const { data: syncRows, error } = await client
        .from('settings')
        .select('*')
        .like('id', 'user_sync_%');

      if (!error && Array.isArray(syncRows)) {
        for (const row of syncRows) {
          const syncData = row.data || {};
          const email = getCleanEmail(syncData.email);
          const userId = syncData.userId || row.id.replace(/^user_sync_email_/, '').replace(/^user_sync_/, '');
          const key = email || userId;
          if (!key) continue;

          const rawCredits = typeof syncData.toolCredits === 'number' ? syncData.toolCredits : 5;
          const explicitTier: PlanTier = (syncData.planTier && ['starter', 'pro', 'vip', 'ultra', 'free'].includes(syncData.planTier))
            ? syncData.planTier
            : 'free';

          const hasPaymentProof = Boolean(
            syncData.lastPaymentId ||
            syncData.paymentId ||
            syncData.lastOrderId ||
            syncData.source === 'razorpay_verified'
          );
          const hasValidUnexpiredPlan = Boolean(
            syncData.planExpiresAt &&
            !isNaN(new Date(syncData.planExpiresAt).getTime()) &&
            new Date(syncData.planExpiresAt).getTime() > Date.now()
          );

          const isGenuinelyPaid = explicitTier !== 'free' && (hasPaymentProof || hasValidUnexpiredPlan);
          const planTier: PlanTier = isGenuinelyPaid ? explicitTier : 'free';
          const isProUser = isGenuinelyPaid || Boolean(syncData.isProUser);

          usersMap.set(key, {
            id: userId,
            email,
            name: syncData.name || (email ? email.split('@')[0] : 'Creator'),
            username: syncData.username || (email ? `@${email.split('@')[0]}` : '@creator'),
            avatar: syncData.avatar,
            planTier,
            isProUser,
            toolCredits: rawCredits,
            aiSearchRemaining: typeof syncData.aiSearchRemaining === 'number' ? syncData.aiSearchRemaining : 5,
            promptRequestsRemaining: typeof syncData.promptRequestsRemaining === 'number' ? syncData.promptRequestsRemaining : 0,
            points: typeof syncData.points === 'number' ? syncData.points : 10,
            planExpiresAt: syncData.planExpiresAt,
            unlockedPromptIds: Array.isArray(syncData.unlockedPromptIds) ? syncData.unlockedPromptIds : [],
            bookmarkedIds: Array.isArray(syncData.bookmarkedIds) ? syncData.bookmarkedIds : [],
            likedIds: Array.isArray(syncData.likedIds) ? syncData.likedIds : [],
            aiHistory: Array.isArray(syncData.aiHistory) ? syncData.aiHistory : [],
            joinedDate: syncData.joinedDate || new Date().toISOString(),
            lastSyncedAt: syncData.updatedAt || syncData.lastSyncedAt || new Date().toISOString(),
            paymentId: syncData.lastPaymentId || syncData.paymentId,
            source: syncData.source || 'supabase_sync',
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching users from Supabase in backup-all:', err);
    }
  }

  // 2. Fetch from local files (data/users.json and data/subscriptions.json)
  const localUsers = readLocalJson<any[]>(USERS_FILE, []);
  if (Array.isArray(localUsers)) {
    for (const u of localUsers) {
      const email = getCleanEmail(u.email);
      const id = u.id || u.userId;
      const key = email || id;
      if (!key) continue;

      if (!usersMap.has(key)) {
        usersMap.set(key, {
          id: id || `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          email,
          name: u.name || (email ? email.split('@')[0] : 'User'),
          username: u.username || (email ? `@${email.split('@')[0]}` : '@user'),
          avatar: u.avatar,
          planTier: u.planTier || 'free',
          isProUser: Boolean(u.isProUser || (u.planTier && u.planTier !== 'free')),
          toolCredits: typeof u.toolCredits === 'number' ? u.toolCredits : 5,
          aiSearchRemaining: typeof u.aiSearchRemaining === 'number' ? u.aiSearchRemaining : 5,
          promptRequestsRemaining: typeof u.promptRequestsRemaining === 'number' ? u.promptRequestsRemaining : 0,
          points: typeof u.points === 'number' ? u.points : 10,
          planExpiresAt: u.planExpiresAt,
          unlockedPromptIds: Array.isArray(u.unlockedPromptIds) ? u.unlockedPromptIds : [],
          bookmarkedIds: Array.isArray(u.bookmarkedIds) ? u.bookmarkedIds : [],
          likedIds: Array.isArray(u.likedIds) ? u.likedIds : [],
          aiHistory: Array.isArray(u.aiHistory) ? u.aiHistory : [],
          joinedDate: u.joinedDate || new Date().toISOString(),
          lastSyncedAt: u.updatedAt || u.lastSyncedAt || new Date().toISOString(),
          paymentId: u.lastPaymentId || u.paymentId,
          source: 'local_store',
        });
      }
    }
  }

  return Array.from(usersMap.values());
}

// Fetch all prompt requests from DB or local
async function fetchAllPromptRequests(): Promise<PromptRequestItem[]> {
  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('settings')
        .select('data')
        .eq('id', PROMPT_REQUESTS_KEY)
        .maybeSingle();

      if (!error && data?.data && Array.isArray(data.data)) {
        return data.data as PromptRequestItem[];
      }
    } catch (err) {
      console.warn('Error loading prompt requests from Supabase in backup-all:', err);
    }
  }

  const local = readLocalJson<PromptRequestItem[]>(path.join(DATA_DIR, 'prompt_requests.json'), []);
  return Array.isArray(local) ? local : [];
}

// Helper to normalize any incoming array/object of prompts
function normalizeIncomingPosts(rawList: any[]): PromptPost[] {
  return rawList
    .map((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return null;
      const promptText = (
        item.promptText ||
        item.prompt ||
        item.text ||
        item.content ||
        item.body ||
        item.description ||
        item.title ||
        item.name ||
        `AI Prompt #${idx + 1}`
      )
        .toString()
        .trim();
      const title = (
        item.title ||
        item.name ||
        item.heading ||
        item.subject ||
        (promptText ? promptText.slice(0, 45) : `Prompt #${idx + 1}`)
      )
        .toString()
        .trim();

      const rawId = item.id || item._id || `prompt-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const safeId = String(rawId).replace(/[\/\s#?\[\]]+/g, '_').slice(0, 100);
      const category = (
        item.category ||
        item.cat ||
        (Array.isArray(item.categories) ? item.categories[0] : null) ||
        'General'
      ).toString();
      const aiTool = (item.aiTool || item.tool || item.model || 'ChatGPT').toString();
      const imageUrl = (
        item.imageUrl ||
        item.image ||
        item.img ||
        item.thumbnail ||
        item.photo ||
        ''
      ).toString();

      let postTags: string[] = [];
      if (Array.isArray(item.tags)) {
        postTags = item.tags.map((t: any) => String(t).trim()).filter(Boolean);
      } else if (typeof item.tags === 'string') {
        postTags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
      if (postTags.length === 0) postTags = ['AI Prompt'];

      const isPremium = Boolean(
        item.isPremium ||
        item.is_premium ||
        item.parameters?.isPremium ||
        item.parameters?.is_premium
      );

      return {
        id: safeId,
        title: title || 'Untitled Prompt',
        slug: item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        category,
        aiTool,
        promptText: promptText || title,
        negativePrompt: (item.negativePrompt || item.negative || '').toString(),
        imageUrl,
        imageAlt: (item.imageAlt || title).toString(),
        imageFileName: item.imageFileName,
        additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [],
        parameters: typeof item.parameters === 'object' && item.parameters ? { ...item.parameters, isPremium } : { isPremium },
        variables: Array.isArray(item.variables) ? item.variables : [],
        articleContent: (item.articleContent || item.article || '').toString(),
        tags: cleanTagsArray(postTags),
        status: item.status === 'draft' ? 'draft' : 'published',
        isFeatured: Boolean(item.isFeatured),
        isTrending: Boolean(item.isTrending),
        isPremium,
        viewsCount: Number(item.viewsCount) || 0,
        copiesCount: Number(item.copiesCount) || 0,
        likesCount: Number(item.likesCount) || 0,
        bookmarksCount: Number(item.bookmarksCount) || 0,
        author: item.author || {
          name: 'tool.reelz',
          avatar: '/logo.png',
          role: 'Author',
        },
        seo: item.seo || {
          metaTitle: title,
          metaDescription: promptText.substring(0, 155),
          focusKeyword: category || 'AI Prompt',
        },
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: item.publishedAt || (item.status === 'published' ? new Date().toISOString() : undefined),
      } as PromptPost;
    })
    .filter((p): p is PromptPost => p !== null);
}

// -------------------------------------------------------------
// GET: Full Comprehensive Backup Export (All Website Data)
// -------------------------------------------------------------
export async function GET() {
  try {
    const [
      allPosts,
      allUsers,
      allCategories,
      allTags,
      allSearchQueries,
      pushNotifications,
      pushSubscribers,
      pushStats,
      allPromptRequests,
      siteSettings,
    ] = await Promise.all([
      ServerStorage.getAllPosts(true),
      fetchAllRegisteredUsers(),
      ServerStorage.getAllCategories(),
      ServerStorage.getAllTags(),
      ServerStorage.getAllSearchQueries(),
      NotificationServerStore.getNotifications(),
      NotificationServerStore.getSubscribers(),
      NotificationServerStore.getStats(),
      fetchAllPromptRequests(),
      ServerStorage.getSettings(),
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    const summary = {
      totalPrompts: allPosts.length,
      totalUsers: allUsers.length,
      totalCategories: allCategories.length,
      totalTags: allTags.length,
      totalSearchQueries: allSearchQueries.length,
      totalPushNotifications: pushNotifications.length,
      totalPushSubscribers: pushSubscribers.length,
      totalRequestedPrompts: allPromptRequests.length,
    };

    const fullArchive = {
      version: '2.0',
      backupType: 'all_website_data',
      exportedAt: new Date().toISOString(),
      site: 'tool.reelz',
      summary,
      posts: allPosts,
      users: allUsers,
      categories: allCategories,
      tags: allTags,
      searchQueries: allSearchQueries,
      pushNotifications: {
        notifications: pushNotifications,
        subscribers: pushSubscribers,
        stats: pushStats,
      },
      promptRequests: allPromptRequests,
      settings: siteSettings,
    };

    return NextResponse.json(
      { success: true, ...fullArchive },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Disposition': `attachment; filename="promptcms-all-website-data-backup-${dateStr}.json"`,
        },
      }
    );
  } catch (error: any) {
    console.error('All website data backup export error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate comprehensive website backup' },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// POST: One-Click Restore for All Website Data
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const mode = rawBody.mode === 'replace' ? 'replace' : 'merge';

    // Support both wrapped payload { data: { posts, ... } } and direct payload { posts, ... }
    const payload = rawBody.data && typeof rawBody.data === 'object' ? rawBody.data : rawBody;

    const restoredSummary = {
      restoredPrompts: 0,
      restoredUsers: 0,
      restoredCategories: 0,
      restoredTags: 0,
      restoredSearchQueries: 0,
      restoredNotifications: 0,
      restoredSubscribers: 0,
      restoredRequests: 0,
      settingsRestored: false,
    };

    const client = supabaseAdmin || supabase;

    // 1. RESTORE PROMPTS
    const rawPostsList = Array.isArray(payload.posts)
      ? payload.posts
      : Array.isArray(payload.prompts)
      ? payload.prompts
      : [];

    if (rawPostsList.length > 0) {
      const normalizedPosts = normalizeIncomingPosts(rawPostsList);
      if (normalizedPosts.length > 0) {
        await ServerStorage.restorePosts(normalizedPosts, mode);
        restoredSummary.restoredPrompts = normalizedPosts.length;

        // Sync to Firebase Firestore
        if (isFirebaseConfigured()) {
          try {
            for (const post of normalizedPosts) {
              await setDoc(doc(firestoreDb, 'posts', post.id), post);
            }
          } catch (fErr) {
            console.warn('Firestore restore posts notice:', fErr);
          }
        }
      }
    }

    // 2. RESTORE REGISTERED USERS
    const rawUsersList = Array.isArray(payload.users)
      ? payload.users
      : Array.isArray(payload.registeredUsers)
      ? payload.registeredUsers
      : [];

    if (rawUsersList.length > 0) {
      const existingLocalUsers = readLocalJson<any[]>(USERS_FILE, []);
      const usersToSaveLocally: any[] = mode === 'replace' ? [] : [...existingLocalUsers];

      for (const item of rawUsersList) {
        if (!item || typeof item !== 'object') continue;
        try {
          const userId = item.id || item.userId || `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const email = getCleanEmail(item.email);
          const key = getSyncKey(userId, email);
          if (!key) continue;

          let existingData: any = {};
          if (mode === 'merge' && isSupabaseConfigured()) {
            const { data: row } = await client.from('settings').select('data').eq('id', key).single();
            if (row?.data) existingData = row.data;
          }

          const resolvedTier: PlanTier = item.planTier || existingData.planTier || 'free';
          const resolvedCredits = typeof item.toolCredits === 'number'
            ? (mode === 'replace' ? item.toolCredits : Math.max(item.toolCredits, existingData.toolCredits || 0))
            : (existingData.toolCredits || 5);
          const resolvedPoints = typeof item.points === 'number'
            ? (mode === 'replace' ? item.points : Math.max(item.points, existingData.points || 0))
            : (existingData.points || 10);
          const resolvedAiSearchRemaining = typeof item.aiSearchRemaining === 'number'
            ? item.aiSearchRemaining
            : (existingData.aiSearchRemaining ?? 5);

          const resolvedUnlocks = Array.from(
            new Set([...(mode === 'replace' ? [] : (existingData.unlockedPromptIds || [])), ...(item.unlockedPromptIds || [])])
          );
          const resolvedBookmarks = Array.from(
            new Set([...(mode === 'replace' ? [] : (existingData.bookmarkedIds || [])), ...(item.bookmarkedIds || [])])
          );
          const resolvedLikes = Array.from(
            new Set([...(mode === 'replace' ? [] : (existingData.likedIds || [])), ...(item.likedIds || [])])
          );

          const userRecord = {
            ...existingData,
            ...item,
            userId,
            id: userId,
            email,
            name: item.name || existingData.name || (email ? email.split('@')[0] : 'Creator'),
            username: item.username || existingData.username || (email ? `@${email.split('@')[0]}` : '@creator'),
            planTier: resolvedTier,
            isProUser: resolvedTier !== 'free' || Boolean(item.isProUser || existingData.isProUser),
            toolCredits: resolvedCredits,
            aiSearchRemaining: resolvedAiSearchRemaining,
            points: resolvedPoints,
            unlockedPromptIds: resolvedUnlocks,
            bookmarkedIds: resolvedBookmarks,
            likedIds: resolvedLikes,
            aiHistory: Array.isArray(item.aiHistory) ? item.aiHistory : (existingData.aiHistory || []),
            joinedDate: item.joinedDate || existingData.joinedDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            restoredAt: new Date().toISOString(),
          };

          // Save to Supabase
          if (isSupabaseConfigured()) {
            await client.from('settings').upsert({ id: key, data: userRecord });
            if (email) {
              const emailKey = getSyncKey(undefined, email);
              if (emailKey !== key) {
                await client.from('settings').upsert({ id: emailKey, data: userRecord });
              }
            }
          }

          // Save to Firebase Firestore
          if (isFirebaseConfigured()) {
            try {
              await setDoc(doc(firestoreDb, 'users', userId), userRecord);
            } catch (fErr) {
              console.warn('Firestore restore user notice:', fErr);
            }
          }

          // Save locally
          const existingIdx = usersToSaveLocally.findIndex((u) => u.id === userId || (email && u.email === email));
          if (existingIdx >= 0) {
            usersToSaveLocally[existingIdx] = userRecord;
          } else {
            usersToSaveLocally.push(userRecord);
          }

          restoredSummary.restoredUsers++;
        } catch (uErr) {
          console.warn('Error restoring single user:', uErr);
        }
      }

      writeLocalJson(USERS_FILE, usersToSaveLocally);
    }

    // 3. RESTORE CATEGORIES
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      for (const cat of payload.categories) {
        if (cat && (cat.name || cat.id)) {
          try {
            await ServerStorage.saveCategory(cat);
            if (isFirebaseConfigured() && cat.id) {
              await setDoc(doc(firestoreDb, 'categories', cat.id), cat);
            }
            restoredSummary.restoredCategories++;
          } catch (cErr) {
            console.warn('Error restoring category:', cErr);
          }
        }
      }
    }

    // 4. RESTORE TAGS
    if (Array.isArray(payload.tags) && payload.tags.length > 0) {
      try {
        const cleanTags = cleanTagsArray(payload.tags);
        await ServerStorage.saveAllTags(cleanTags);
        if (isFirebaseConfigured()) {
          await setDoc(doc(firestoreDb, 'settings', 'all_tags'), { tags: cleanTags });
        }
        restoredSummary.restoredTags = cleanTags.length;
      } catch (tErr) {
        console.warn('Error restoring tags:', tErr);
      }
    }

    // 5. RESTORE SEARCH QUERIES
    const rawQueries = Array.isArray(payload.searchQueries)
      ? payload.searchQueries
      : Array.isArray(payload.queries)
      ? payload.queries
      : [];

    if (rawQueries.length > 0) {
      try {
        await ServerStorage.restoreSearchQueries(rawQueries);
        if (isFirebaseConfigured()) {
          for (const q of rawQueries) {
            if (q && q.query) {
              const qId = q.id || `q_${q.query.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
              await setDoc(doc(firestoreDb, 'search_queries', qId), q);
            }
          }
        }
        restoredSummary.restoredSearchQueries = rawQueries.length;
      } catch (sqErr) {
        console.warn('Error restoring search queries:', sqErr);
      }
    }

    // 6. RESTORE PUSH NOTIFICATIONS & SUBSCRIBERS
    const pushData = payload.pushNotifications || {};
    const notifs = Array.isArray(pushData.notifications) ? pushData.notifications : (Array.isArray(payload.notifications) ? payload.notifications : []);
    const subs = Array.isArray(pushData.subscribers) ? pushData.subscribers : (Array.isArray(payload.subscribers) ? payload.subscribers : []);

    if (notifs.length > 0) {
      try {
        await NotificationServerStore.saveNotifications(notifs);
        if (isFirebaseConfigured()) {
          for (const n of notifs) {
            if (n && n.id) {
              await setDoc(doc(firestoreDb, 'push_notifications', n.id), n);
            }
          }
        }
        restoredSummary.restoredNotifications = notifs.length;
      } catch (nErr) {
        console.warn('Error restoring notifications:', nErr);
      }
    }

    if (subs.length > 0) {
      try {
        for (const s of subs) {
          if (s && s.id) {
            await NotificationServerStore.addOrUpdateSubscriber(s);
          }
        }
        restoredSummary.restoredSubscribers = subs.length;
      } catch (sErr) {
        console.warn('Error restoring subscribers:', sErr);
      }
    }

    // 7. RESTORE REQUESTED PROMPTS
    const rawRequests = Array.isArray(payload.promptRequests)
      ? payload.promptRequests
      : Array.isArray(payload.requests)
      ? payload.requests
      : [];

    if (rawRequests.length > 0) {
      try {
        if (isSupabaseConfigured()) {
          await client.from('settings').upsert({
            id: PROMPT_REQUESTS_KEY,
            data: rawRequests,
          });
        }
        if (isFirebaseConfigured()) {
          for (const r of rawRequests) {
            if (r && r.id) {
              await setDoc(doc(firestoreDb, 'prompt_requests', r.id), r);
            }
          }
        }
        writeLocalJson(path.join(DATA_DIR, 'prompt_requests.json'), rawRequests);
        restoredSummary.restoredRequests = rawRequests.length;
      } catch (rErr) {
        console.warn('Error restoring prompt requests:', rErr);
      }
    }

    // 8. RESTORE SITE SETTINGS
    if (payload.settings && typeof payload.settings === 'object') {
      try {
        await ServerStorage.saveSettings(payload.settings);
        if (isFirebaseConfigured()) {
          await setDoc(doc(firestoreDb, 'settings', 'general_settings'), payload.settings);
        }
        restoredSummary.settingsRestored = true;
      } catch (setErr) {
        console.warn('Error restoring settings:', setErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Complete website data successfully restored! (${restoredSummary.restoredPrompts} prompts, ${restoredSummary.restoredUsers} users, ${restoredSummary.restoredCategories} categories, ${restoredSummary.restoredTags} tags, ${restoredSummary.restoredSearchQueries} queries, ${restoredSummary.restoredNotifications} notifications, ${restoredSummary.restoredRequests} requests)`,
      summary: restoredSummary,
    });
  } catch (error: any) {
    console.error('All website data restore error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to restore website data' },
      { status: 500 }
    );
  }
}
