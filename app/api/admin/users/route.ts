import { NextRequest, NextResponse } from 'next/server';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { RegisteredUserRecord, PlanTier } from '@/types/prompt';
import { getClientIp, checkRateLimit, createRateLimitResponse, sanitizePayload } from '@/lib/security';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getCleanEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

function getSyncKey(userId?: string, email?: string): string {
  if (userId) return userId.trim();
  if (email) {
    return email.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  return '';
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

export async function GET(req: NextRequest) {
  // Security: Rate limiting protection (35 req/min)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('admin', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const usersMap = new Map<string, RegisteredUserRecord>();

    // 1. Fetch from Firebase Firestore 'users' collection
    if (isFirebaseConfigured()) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        if (!snap.empty) {
          const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, vip: 3, ultra: 4 };

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

            const toolCredits = rawCredits;
            const points = typeof syncData.points === 'number' ? syncData.points : 10;
            const planExpiresAt = syncData.planExpiresAt;
            const unlockedPromptIds = Array.isArray(syncData.unlockedPromptIds) ? syncData.unlockedPromptIds : [];
            const bookmarks = Array.isArray(syncData.bookmarkedIds) ? syncData.bookmarkedIds : [];
            const likes = Array.isArray(syncData.likedIds) ? syncData.likedIds : [];
            const aiHistory = Array.isArray(syncData.aiHistory) ? syncData.aiHistory : [];

            const existing = usersMap.get(key);
            if (!existing) {
              usersMap.set(key, {
                id: userId,
                email: email || `${userId}@user.local`,
                name: syncData.name || (email ? email.split('@')[0] : 'Creator'),
                username: syncData.username || (email ? `@${email.split('@')[0]}` : '@creator'),
                avatar:
                  syncData.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
                planTier,
                isProUser,
                planExpiresAt,
                planStartedAt: syncData.planStartedAt,
                queuedPlan: syncData.queuedPlan || null,
                toolCredits,
                points,
                unlockedPromptIds,
                promptRequestsRemaining: syncData.promptRequestsRemaining || 0,
                aiHistoryCount: aiHistory.length,
                bookmarksCount: bookmarks.length,
                likesCount: likes.length,
                joinedDate:
                  syncData.joinedDate ||
                  (syncData.updatedAt
                    ? new Date(syncData.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'Recently'),
                lastSyncedAt: syncData.updatedAt || new Date().toISOString(),
                source: 'firebase',
                rawSyncData: syncData,
              });
            } else {
              const updatedUnlocks = Array.from(new Set([...existing.unlockedPromptIds, ...unlockedPromptIds]));
              existing.unlockedPromptIds = updatedUnlocks;
              if (toolCredits > existing.toolCredits) existing.toolCredits = toolCredits;
              if (points > existing.points) existing.points = points;
              if (isProUser) existing.isProUser = true;
              if ((TIER_RANK[planTier] || 0) > (TIER_RANK[existing.planTier] || 0)) {
                existing.planTier = planTier;
              }
              if (syncData.updatedAt && new Date(syncData.updatedAt) > new Date(existing.lastSyncedAt || 0)) {
                existing.lastSyncedAt = syncData.updatedAt;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Firestore users collection fetch notice:', err);
      }
    }

    // 2. Fetch from local users.json file to guarantee no user is missing
    try {
      const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(USERS_FILE)) {
        const rawLocal = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const usersArray = Array.isArray(rawLocal) ? rawLocal : Object.values(rawLocal);
        for (const u of usersArray) {
          if (!u || typeof u !== 'object') continue;
          const email = getCleanEmail(u.email);
          const userId = u.id || u.userId;
          const key = email || userId;
          if (!key) continue;

          const existing = usersMap.get(key);
          if (!existing) {
            usersMap.set(key, {
              id: userId || `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: email || `${userId || 'user'}@user.local`,
              name: u.name || (email ? email.split('@')[0] : 'User'),
              username: u.username || (email ? `@${email.split('@')[0]}` : '@user'),
              avatar:
                u.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
              planTier: u.planTier || 'free',
              isProUser: Boolean(u.isProUser || (u.planTier && u.planTier !== 'free')),
              toolCredits: typeof u.toolCredits === 'number' ? u.toolCredits : 5,
              points: typeof u.points === 'number' ? u.points : 10,
              unlockedPromptIds: Array.isArray(u.unlockedPromptIds) ? u.unlockedPromptIds : [],
              promptRequestsRemaining: u.promptRequestsRemaining || 0,
              aiHistoryCount: Array.isArray(u.aiHistory) ? u.aiHistory.length : 0,
              bookmarksCount: Array.isArray(u.bookmarkedIds) ? u.bookmarkedIds.length : u.bookmarksCount || 0,
              likesCount: Array.isArray(u.likedIds) ? u.likedIds.length : u.likesCount || 0,
              joinedDate: u.joinedDate || 'Recently',
              lastSyncedAt: u.updatedAt || u.lastSyncedAt || new Date().toISOString(),
              source: 'local_store',
            });
          }
        }
      }
    } catch (lErr) {
      console.warn('Local users read notice:', lErr);
    }

    // 3. Enrich from Razorpay if configured
    const rzpKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SKvY1N5zP65v3p';
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (rzpKeyId && rzpKeySecret) {
      try {
        const Razorpay = (await import('razorpay')).default;
        const razorpay = new Razorpay({
          key_id: rzpKeyId,
          key_secret: rzpKeySecret,
        });
        const payments = await razorpay.payments.all({ count: 100 });
        if (payments && Array.isArray((payments as any).items)) {
          for (const p of (payments as any).items) {
            if (p.status === 'captured') {
              const payEmail = getCleanEmail(p.email);
              const amountRupees = Math.round(Number(p.amount) / 100);
              const inferredTier: PlanTier =
                amountRupees >= 199 ? 'vip' : amountRupees >= 99 ? 'pro' : amountRupees >= 49 ? 'starter' : 'pro';
              const payDate = p.created_at ? new Date(p.created_at * 1000).toISOString() : new Date().toISOString();

              if (payEmail && usersMap.has(payEmail)) {
                const user = usersMap.get(payEmail)!;
                user.isProUser = true;
                user.planTier = inferredTier;
                user.source = 'razorpay_verified';
                user.paymentId = p.id;
              } else if (payEmail) {
                const cleanPrefix = payEmail.split('@')[0];
                usersMap.set(payEmail, {
                  id: `rzp_${p.id}`,
                  email: payEmail,
                  name: cleanPrefix,
                  username: `@${cleanPrefix}`,
                  avatar:
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
                  planTier: inferredTier,
                  isProUser: true,
                  toolCredits: inferredTier === 'vip' ? 500 : 250,
                  points: 30,
                  unlockedPromptIds: [],
                  promptRequestsRemaining: 2,
                  aiHistoryCount: 0,
                  bookmarksCount: 0,
                  likesCount: 0,
                  joinedDate: new Date(payDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  lastSyncedAt: payDate,
                  source: 'razorpay_verified',
                  paymentId: p.id,
                });
              }
            }
          }
        }
      } catch (rzpErr) {
        console.warn('Razorpay payments enrichment fallback:', rzpErr);
      }
    }

    const users = Array.from(usersMap.values()).sort((a, b) => {
      if (a.isProUser && !b.isProUser) return -1;
      if (!a.isProUser && b.isProUser) return 1;
      if (b.toolCredits !== a.toolCredits) return b.toolCredits - a.toolCredits;
      return new Date(b.lastSyncedAt || 0).getTime() - new Date(a.lastSyncedAt || 0).getTime();
    });

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      fetchedAt: new Date().toISOString(),
      users,
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch users from database' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Security: Rate limiting protection (35 req/min)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('admin', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);
    const { action, users, mode = 'merge' } = body;

    // 1. RESTORE ALL USERS FROM BACKUP
    if (action === 'restore_users') {
      if (!Array.isArray(users) || users.length === 0) {
        return NextResponse.json({ success: false, error: 'No user records provided for restoration' }, { status: 400 });
      }

      let restoredCount = 0;
      const errors: string[] = [];
      const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

      let localUsersDict: Record<string, any> = {};
      try {
        if (fs.existsSync(USERS_FILE)) {
          const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
          if (Array.isArray(raw)) {
            for (const item of raw) {
              if (item.email) localUsersDict[item.email] = item;
              if (item.id) localUsersDict[item.id] = item;
            }
          } else if (raw && typeof raw === 'object') {
            localUsersDict = raw;
          }
        }
      } catch {}

      for (const item of users) {
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
              else if (email) {
                const snapE = await getDoc(doc(firestoreDb, 'users', email.replace(/[^a-z0-9_]/g, '_')));
                if (snapE.exists()) existingData = snapE.data();
              }
            } catch {}
          }

          const resolvedTier = item.planTier || existingData.planTier || 'free';
          const resolvedCredits =
            typeof item.toolCredits === 'number'
              ? Math.max(item.toolCredits, existingData.toolCredits || 0)
              : existingData.toolCredits || 5;
          const resolvedPoints =
            typeof item.points === 'number'
              ? Math.max(item.points, existingData.points || 0)
              : existingData.points || 10;
          const resolvedUnlocks = Array.from(
            new Set([...(existingData.unlockedPromptIds || []), ...(item.unlockedPromptIds || [])])
          );
          const resolvedAiSearchRemaining =
            typeof item.aiSearchRemaining === 'number'
              ? item.aiSearchRemaining
              : existingData.aiSearchRemaining ?? 5;
          const resolvedBookmarks = Array.isArray(item.bookmarkedIds)
            ? Array.from(new Set([...(existingData.bookmarkedIds || []), ...item.bookmarkedIds]))
            : existingData.bookmarkedIds || [];

          const payload = {
            ...existingData,
            ...item,
            userId,
            id: userId,
            email,
            name: item.name || existingData.name || (email ? email.split('@')[0] : 'Creator'),
            username: existingData.username || (email ? `@${email.split('@')[0]}` : '@creator'),
            avatar: existingData.avatar,
            planTier: resolvedTier,
            isProUser: resolvedTier !== 'free' || Boolean(item.isProUser || existingData.isProUser),
            toolCredits: resolvedCredits,
            aiSearchRemaining: resolvedAiSearchRemaining,
            points: resolvedPoints,
            unlockedPromptIds: resolvedUnlocks,
            bookmarkedIds: resolvedBookmarks,
            joinedDate: item.joinedDate || existingData.joinedDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            restoredAt: new Date().toISOString(),
          };

          // Save to Firestore
          if (isFirebaseConfigured()) {
            await setDoc(doc(firestoreDb, 'users', userId), cleanForFirestore(payload));
            if (email) {
              const cleanEKey = email.replace(/[^a-z0-9_]/g, '_');
              if (cleanEKey !== userId) {
                await setDoc(doc(firestoreDb, 'users', cleanEKey), cleanForFirestore(payload));
              }
            }
          }

          // Save locally
          if (email) localUsersDict[email] = payload;
          localUsersDict[userId] = payload;
          restoredCount++;
        } catch (e: any) {
          errors.push(e?.message || 'Item error');
        }
      }

      try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(localUsersDict, null, 2), 'utf-8');
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Successfully restored ${restoredCount} user accounts into Firebase database.`,
        restoredCount,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      });
    }

    // 2. UPDATE USER PLAN / CREDITS DIRECTLY
    if (action === 'update_user') {
      const { userId, email, planTier, toolCredits, points } = body;
      const key = userId || (email ? email.replace(/[^a-z0-9_]/g, '_') : '');
      if (!key) {
        return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
      }

      let existing: any = {};
      if (isFirebaseConfigured()) {
        try {
          const snap = await getDoc(doc(firestoreDb, 'users', key));
          if (snap.exists()) existing = snap.data();
        } catch {}
      }

      const updatedPayload = {
        ...existing,
        userId: userId || existing.userId || key,
        email: email || existing.email,
        planTier: planTier || existing.planTier || 'free',
        isProUser: planTier ? planTier !== 'free' : existing.isProUser,
        toolCredits: typeof toolCredits === 'number' ? toolCredits : existing.toolCredits ?? 5,
        points: typeof points === 'number' ? points : existing.points ?? 10,
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured()) {
        await setDoc(doc(firestoreDb, 'users', key), cleanForFirestore(updatedPayload));
        if (email) {
          const cleanE = email.replace(/[^a-z0-9_]/g, '_');
          if (cleanE !== key) {
            await setDoc(doc(firestoreDb, 'users', cleanE), cleanForFirestore(updatedPayload));
          }
        }
      }

      // Update local file
      try {
        const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
        let localData: any = {};
        if (fs.existsSync(USERS_FILE)) {
          localData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        }
        if (email) localData[email] = updatedPayload;
        if (userId) localData[userId] = updatedPayload;
        fs.writeFileSync(USERS_FILE, JSON.stringify(localData, null, 2), 'utf-8');
      } catch {}

      return NextResponse.json({ success: true, message: 'User updated successfully in Firebase', updated: updatedPayload });
    }

    // 3. DELETE USER
    if (action === 'delete_user') {
      const { userId, email } = body;
      if (!userId && !email) {
        return NextResponse.json({ success: false, error: 'User ID or Email is required for deletion' }, { status: 400 });
      }

      if (isFirebaseConfigured()) {
        if (userId) await deleteDoc(doc(firestoreDb, 'users', userId));
        if (email) await deleteDoc(doc(firestoreDb, 'users', email.replace(/[^a-z0-9_]/g, '_')));
      }

      // Delete from local file
      try {
        const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
        if (fs.existsSync(USERS_FILE)) {
          const localData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
          if (email && localData[email]) delete localData[email];
          if (userId && localData[userId]) delete localData[userId];
          fs.writeFileSync(USERS_FILE, JSON.stringify(localData, null, 2), 'utf-8');
        }
      } catch {}

      return NextResponse.json({ success: true, message: 'User deleted successfully from Firebase and database.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error processing users request' },
      { status: 500 }
    );
  }
}
