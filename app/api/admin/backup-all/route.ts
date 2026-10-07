import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { NotificationServerStore } from '@/lib/notification-storage';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import {
  RegisteredUserRecord,
  PromptPost,
  Category,
  SearchQueryItem,
  PromptRequestItem,
  SiteSettings,
  PlanTier,
} from '@/types/prompt';
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

// Fetch all registered users from Firestore and local files
async function fetchAllRegisteredUsers(): Promise<RegisteredUserRecord[]> {
  const usersMap = new Map<string, RegisteredUserRecord>();

  // 1. Fetch from Firestore users collection
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(firestoreDb, 'users'));
      for (const d of snap.docs) {
        const syncData = d.data() as any;
        const email = getCleanEmail(syncData.email);
        const userId = syncData.userId || syncData.id || d.id;
        const key = email || userId;
        if (!key) continue;

        const rawCredits = typeof syncData.toolCredits === 'number' ? syncData.toolCredits : 5;
        const explicitTier: PlanTier =
          syncData.planTier && ['starter', 'pro', 'vip', 'ultra', 'free'].includes(syncData.planTier)
            ? syncData.planTier
            : 'free';

        const isGenuinelyPaid = explicitTier !== 'free' || Boolean(syncData.isProUser);
        const planTier: PlanTier = isGenuinelyPaid ? explicitTier : 'free';
        const isProUser = isGenuinelyPaid;

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
          promptRequestsRemaining:
            typeof syncData.promptRequestsRemaining === 'number' ? syncData.promptRequestsRemaining : 0,
          points: typeof syncData.points === 'number' ? syncData.points : 10,
          planExpiresAt: syncData.planExpiresAt,
          unlockedPromptIds: Array.isArray(syncData.unlockedPromptIds) ? syncData.unlockedPromptIds : [],
          bookmarkedIds: Array.isArray(syncData.bookmarkedIds) ? syncData.bookmarkedIds : [],
          likedIds: Array.isArray(syncData.likedIds) ? syncData.likedIds : [],
          aiHistory: Array.isArray(syncData.aiHistory) ? syncData.aiHistory : [],
          joinedDate: syncData.joinedDate || new Date().toISOString(),
          lastSyncedAt: syncData.updatedAt || syncData.lastSyncedAt || new Date().toISOString(),
          paymentId: syncData.lastPaymentId || syncData.paymentId,
          source: 'firebase',
        });
      }
    } catch (err) {
      console.warn('Error fetching users from Firestore in backup-all:', err);
    }
  }

  // 2. Fetch from local files (data/users.json)
  const localUsers = readLocalJson<any>(USERS_FILE, []);
  const localArray = Array.isArray(localUsers) ? localUsers : Object.values(localUsers);
  for (const u of localArray) {
    if (!u || typeof u !== 'object') continue;
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
        promptRequestsRemaining: u.promptRequestsRemaining || 0,
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

  // 3. Fetch from subscriptions.json
  const localSubs = readLocalJson<Record<string, any>>(SUBSCRIPTIONS_FILE, {});
  for (const [keyEmail, sub] of Object.entries(localSubs)) {
    if (!sub || typeof sub !== 'object') continue;
    const email = getCleanEmail(sub.email || keyEmail);
    if (!email) continue;

    if (usersMap.has(email)) {
      const user = usersMap.get(email)!;
      user.planTier = sub.planTier || user.planTier;
      user.isProUser = true;
      user.planExpiresAt = sub.planExpiresAt || user.planExpiresAt;
      user.paymentId = sub.paymentId || user.paymentId;
    } else {
      usersMap.set(email, {
        id: sub.userId || `u_${Date.now()}`,
        email,
        name: email.split('@')[0],
        username: `@${email.split('@')[0]}`,
        planTier: sub.planTier || 'pro',
        isProUser: true,
        toolCredits: sub.credits || 250,
        aiSearchRemaining: sub.aiSearchQuota || 200,
        promptRequestsRemaining: sub.promptRequests || 2,
        points: 30,
        unlockedPromptIds: [],
        bookmarkedIds: [],
        likedIds: [],
        aiHistory: [],
        joinedDate: sub.planStartedAt || new Date().toISOString(),
        lastSyncedAt: sub.updatedAt || new Date().toISOString(),
        paymentId: sub.paymentId,
        source: 'local_store',
      });
    }
  }

  return Array.from(usersMap.values()).sort(
    (a, b) => new Date(b.lastSyncedAt || 0).getTime() - new Date(a.lastSyncedAt || 0).getTime()
  );
}

// Fetch prompt requests
async function fetchAllPromptRequests(): Promise<PromptRequestItem[]> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'settings', PROMPT_REQUESTS_KEY));
      if (snap.exists() && Array.isArray(snap.data()?.requests)) {
        return snap.data()?.requests;
      }
    } catch {}
  }
  const localReqs = readLocalJson<PromptRequestItem[]>(path.join(DATA_DIR, 'prompt_requests.json'), []);
  return localReqs;
}

// Normalize incoming prompts safely
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

      let tags: string[] = [];
      if (Array.isArray(item.tags)) {
        tags = item.tags.map((t: any) => String(t).trim()).filter(Boolean);
      } else if (typeof item.tags === 'string') {
        tags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
      if (tags.length === 0) tags = ['AI Prompt'];

      return {
        id: safeId,
        title: title || 'Untitled Prompt',
        slug: item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        category,
        aiTool,
        promptText: promptText || title,
        negativePrompt: (item.negativePrompt || item.negative || '').toString(),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
        imageAlt: (item.imageAlt || title).toString(),
        imageFileName: item.imageFileName,
        additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [],
        parameters: typeof item.parameters === 'object' && item.parameters ? item.parameters : {},
        variables: Array.isArray(item.variables) ? item.variables : [],
        articleContent: (item.articleContent || item.article || '').toString(),
        tags: cleanTagsArray(tags),
        status: item.status === 'draft' ? 'draft' : 'published',
        isFeatured: Boolean(item.isFeatured),
        isTrending: Boolean(item.isTrending),
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
        publishedAt: item.publishedAt || new Date().toISOString(),
      } as PromptPost;
    })
    .filter((p): p is PromptPost => p !== null && p.promptText.length > 0);
}

// -------------------------------------------------------------
// GET: Export entire website data
// -------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    const [
      allPosts,
      allCategories,
      allTags,
      settings,
      searchQueries,
      registeredUsers,
      promptRequests,
      subscribers,
      notifications,
      notificationStats,
    ] = await Promise.all([
      ServerStorage.getAllPosts(true),
      ServerStorage.getAllCategories(),
      ServerStorage.getAllTags(),
      ServerStorage.getSettings(),
      ServerStorage.getSearchQueries(200),
      fetchAllRegisteredUsers(),
      fetchAllPromptRequests(),
      NotificationServerStore.getSubscribers(),
      NotificationServerStore.getNotifications(),
      NotificationServerStore.getStats(),
    ]);

    const backupPayload = {
      site: 'tool.reelz',
      version: '3.0',
      backupType: 'all_website_master_backup',
      exportedAt: new Date().toISOString(),
      summary: {
        totalPrompts: allPosts.length,
        totalRegisteredUsers: registeredUsers.length,
        totalCategories: allCategories.length,
        totalTags: allTags.length,
        totalSearchQueries: searchQueries.length,
        totalPushNotifications: notifications.length,
        totalPushSubscribers: subscribers.length,
        totalPromptRequests: promptRequests.length,
      },
      data: {
        posts: allPosts,
        categories: allCategories,
        tags: allTags,
        settings,
        searchQueries,
        registeredUsers,
        promptRequests,
        pushNotifications: notifications,
        pushSubscribers: subscribers,
        notificationStats,
      },
    };

    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    if (download) {
      headers['Content-Disposition'] =
        `attachment; filename="toolreelz-master-backup-${new Date().toISOString().slice(0, 10)}.json"`;
    }

    return NextResponse.json({ success: true, ...backupPayload }, { headers });
  } catch (error: any) {
    console.error('All website backup export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// -------------------------------------------------------------
// POST: Restore entire website data
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const mode: 'merge' | 'replace' = rawBody.mode === 'replace' ? 'replace' : 'merge';
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
      }
    }

    // 2. RESTORE REGISTERED USERS
    const rawUsersList = Array.isArray(payload.registeredUsers)
      ? payload.registeredUsers
      : Array.isArray(payload.users)
      ? payload.users
      : [];

    if (rawUsersList.length > 0) {
      const existingLocalUsers = readLocalJson<any>(USERS_FILE, {});
      const localUsersDict: Record<string, any> = Array.isArray(existingLocalUsers)
        ? {}
        : { ...existingLocalUsers };

      for (const item of rawUsersList) {
        if (!item || typeof item !== 'object') continue;
        try {
          const userId = item.id || item.userId || `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const email = getCleanEmail(item.email);
          const key = userId || email;
          if (!key) continue;

          let existingData: any = {};
          if (mode === 'merge' && isFirebaseConfigured()) {
            try {
              const snap = await getDoc(doc(firestoreDb, 'users', userId));
              if (snap.exists()) existingData = snap.data();
            } catch {}
          }

          const resolvedTier: PlanTier = item.planTier || existingData.planTier || 'free';
          const resolvedCredits =
            typeof item.toolCredits === 'number'
              ? mode === 'replace'
                ? item.toolCredits
                : Math.max(item.toolCredits, existingData.toolCredits || 0)
              : existingData.toolCredits || 5;
          const resolvedPoints =
            typeof item.points === 'number'
              ? mode === 'replace'
                ? item.points
                : Math.max(item.points, existingData.points || 0)
              : existingData.points || 10;
          const resolvedAiSearchRemaining =
            typeof item.aiSearchRemaining === 'number'
              ? item.aiSearchRemaining
              : existingData.aiSearchRemaining ?? 5;

          const resolvedUnlocks = Array.from(
            new Set([
              ...(mode === 'replace' ? [] : existingData.unlockedPromptIds || []),
              ...(item.unlockedPromptIds || []),
            ])
          );
          const resolvedBookmarks = Array.from(
            new Set([
              ...(mode === 'replace' ? [] : existingData.bookmarkedIds || []),
              ...(item.bookmarkedIds || []),
            ])
          );
          const resolvedLikes = Array.from(
            new Set([...(mode === 'replace' ? [] : existingData.likedIds || []), ...(item.likedIds || [])])
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
            aiHistory: Array.isArray(item.aiHistory) ? item.aiHistory : existingData.aiHistory || [],
            joinedDate: item.joinedDate || existingData.joinedDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            restoredAt: new Date().toISOString(),
          };

          // Save to Firebase Firestore
          if (isFirebaseConfigured()) {
            await setDoc(doc(firestoreDb, 'users', userId), cleanForFirestore(userRecord));
            if (email) {
              const cleanEKey = email.replace(/[^a-z0-9_]/g, '_');
              if (cleanEKey !== userId) {
                await setDoc(doc(firestoreDb, 'users', cleanEKey), cleanForFirestore(userRecord));
              }
            }
          }

          // Save locally
          if (email) localUsersDict[email] = userRecord;
          localUsersDict[userId] = userRecord;
          restoredSummary.restoredUsers++;
        } catch (uErr) {
          console.warn('Error restoring single user:', uErr);
        }
      }

      writeLocalJson(USERS_FILE, localUsersDict);
    }

    // 3. RESTORE CATEGORIES
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      for (const cat of payload.categories) {
        if (cat && (cat.name || cat.id)) {
          try {
            await ServerStorage.saveCategory(cat);
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
        restoredSummary.restoredTags = cleanTags.length;
      } catch (tErr) {
        console.warn('Error restoring tags:', tErr);
      }
    }

    // 5. RESTORE SEARCH QUERIES
    if (Array.isArray(payload.searchQueries) && payload.searchQueries.length > 0) {
      try {
        await ServerStorage.restoreSearchQueries(payload.searchQueries);
        restoredSummary.restoredSearchQueries = payload.searchQueries.length;
      } catch (sqErr) {
        console.warn('Error restoring search queries:', sqErr);
      }
    }

    // 6. RESTORE PUSH NOTIFICATIONS
    if (Array.isArray(payload.pushNotifications) && payload.pushNotifications.length > 0) {
      try {
        await NotificationServerStore.saveNotifications(payload.pushNotifications);
        restoredSummary.restoredNotifications = payload.pushNotifications.length;
      } catch (nErr) {
        console.warn('Error restoring notifications:', nErr);
      }
    }

    // 7. RESTORE SUBSCRIBERS
    if (Array.isArray(payload.pushSubscribers) && payload.pushSubscribers.length > 0) {
      try {
        await NotificationServerStore.saveSubscribers(payload.pushSubscribers);
        restoredSummary.restoredSubscribers = payload.pushSubscribers.length;
      } catch (sErr) {
        console.warn('Error restoring subscribers:', sErr);
      }
    }

    // 8. RESTORE PROMPT REQUESTS
    if (Array.isArray(payload.promptRequests) && payload.promptRequests.length > 0) {
      try {
        if (isFirebaseConfigured()) {
          await setDoc(doc(firestoreDb, 'settings', PROMPT_REQUESTS_KEY), {
            requests: payload.promptRequests,
            updatedAt: new Date().toISOString(),
          });
        }
        writeLocalJson(path.join(DATA_DIR, 'prompt_requests.json'), payload.promptRequests);
        restoredSummary.restoredRequests = payload.promptRequests.length;
      } catch (rErr) {
        console.warn('Error restoring prompt requests:', rErr);
      }
    }

    // 9. RESTORE SITE SETTINGS
    if (payload.settings && typeof payload.settings === 'object') {
      try {
        await ServerStorage.saveSettings(payload.settings);
        restoredSummary.settingsRestored = true;
      } catch (stErr) {
        console.warn('Error restoring site settings:', stErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Complete website data successfully restored into Firebase (${mode} mode)!`,
      summary: restoredSummary,
    });
  } catch (error: any) {
    console.error('All website restore error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
