import fs from 'fs';
import path from 'path';
import { PushNotificationItem, PushSubscriber } from '@/types/notification';
import { supabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const STATS_FILE = path.join(DATA_DIR, 'notification_stats.json');

export interface NotificationServerStats {
  totalSent: number;
  totalSubscribers: number;
  totalClicks: number;
  lastSentAt?: string;
}

let memoryNotifications: PushNotificationItem[] | null = null;
let memorySubscribers: PushSubscriber[] | null = null;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

function readJson<T>(filePath: string, fallback: T): T {
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

function writeJson<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

function getDbClient() {
  return supabaseAdmin || supabase;
}

export const NotificationServerStore = {
  // SUBSCRIBERS
  getSubscribers: (): PushSubscriber[] => {
    if (memorySubscribers !== null) return memorySubscribers;
    const list = readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
    memorySubscribers = list;
    return list;
  },

  addOrUpdateSubscriber: (sub: PushSubscriber): { subscribers: PushSubscriber[]; count: number } => {
    const list = readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
    const existingIndex = list.findIndex(
      (s) => s.id === sub.id || (s.endpoint && s.endpoint === sub.endpoint)
    );

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...sub,
        lastActiveAt: new Date().toISOString(),
      };
    } else {
      list.unshift({
        ...sub,
        subscribedAt: sub.subscribedAt || new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    }

    writeJson(SUBSCRIBERS_FILE, list);
    memorySubscribers = list;
    return { subscribers: list, count: list.length };
  },

  removeSubscriber: (id: string): { count: number } => {
    const list = readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
    const filtered = list.filter((s) => s.id !== id);
    writeJson(SUBSCRIBERS_FILE, filtered);
    memorySubscribers = filtered;
    return { count: filtered.length };
  },

  // NOTIFICATIONS (DATABASE DRIVEN)
  getNotifications: async (): Promise<PushNotificationItem[]> => {
    // 1. Try Supabase Database first
    if (isSupabaseConfigured()) {
      try {
        const client = getDbClient();
        // Check settings table under 'system_notifications'
        const { data, error } = await client
          .from('settings')
          .select('*')
          .eq('id', 'system_notifications')
          .maybeSingle();

        if (!error && data && data.data && Array.isArray(data.data)) {
          memoryNotifications = data.data;
          writeJson(NOTIFICATIONS_FILE, data.data);
          return data.data;
        }
      } catch (dbErr) {
        console.warn('Supabase getNotifications error:', dbErr);
      }
    }

    // 2. Fallback to cached memory or local JSON
    if (memoryNotifications !== null) {
      return memoryNotifications;
    }

    const localList = readJson<PushNotificationItem[]>(NOTIFICATIONS_FILE, []);
    memoryNotifications = localList;
    return localList;
  },

  // Synchronous getter for quick in-memory access
  getNotificationsSync: (): PushNotificationItem[] => {
    if (memoryNotifications !== null) return memoryNotifications;
    const local = readJson<PushNotificationItem[]>(NOTIFICATIONS_FILE, []);
    memoryNotifications = local;
    return local;
  },

  saveNotifications: async (items: PushNotificationItem[]): Promise<PushNotificationItem[]> => {
    memoryNotifications = items;
    writeJson(NOTIFICATIONS_FILE, items);

    // Persist to Supabase database
    if (isSupabaseConfigured()) {
      try {
        const client = getDbClient();
        await client.from('settings').upsert(
          {
            id: 'system_notifications',
            data: items,
          },
          { onConflict: 'id' }
        );
      } catch (dbErr) {
        console.error('Supabase saveNotifications error:', dbErr);
      }
    }

    return items;
  },

  addNotification: async (
    item: PushNotificationItem
  ): Promise<{ notification: PushNotificationItem; totalSent: number }> => {
    const list = await NotificationServerStore.getNotifications();
    const updated = [item, ...list.filter((n) => n.id !== item.id)];
    await NotificationServerStore.saveNotifications(updated);

    // Update Stats
    const stats = readJson<NotificationServerStats>(STATS_FILE, {
      totalSent: 0,
      totalSubscribers: 0,
      totalClicks: 0,
    });
    stats.totalSent = (stats.totalSent || 0) + 1;
    stats.lastSentAt = item.sentAt;
    writeJson(STATS_FILE, stats);

    return { notification: item, totalSent: stats.totalSent };
  },

  deleteNotification: async (id: string): Promise<PushNotificationItem[]> => {
    const list = await NotificationServerStore.getNotifications();
    const updated = list.filter((n) => n.id !== id);
    await NotificationServerStore.saveNotifications(updated);
    return updated;
  },

  clearAllNotifications: async (): Promise<void> => {
    await NotificationServerStore.saveNotifications([]);
  },

  getStats: (): NotificationServerStats => {
    const subscribers = readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
    const notifications = readJson<PushNotificationItem[]>(NOTIFICATIONS_FILE, []);
    const stats = readJson<NotificationServerStats>(STATS_FILE, {
      totalSent: notifications.length,
      totalSubscribers: subscribers.length,
      totalClicks: 0,
    });

    return {
      totalSent: Math.max(stats.totalSent || 0, notifications.length),
      totalSubscribers: subscribers.length,
      totalClicks: stats.totalClicks || 0,
      lastSentAt: stats.lastSentAt || (notifications[0] ? notifications[0].sentAt : undefined),
    };
  },
};
