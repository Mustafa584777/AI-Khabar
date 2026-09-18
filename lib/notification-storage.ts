import fs from 'fs';
import path from 'path';
import { PushNotificationItem, PushSubscriber } from '@/types/notification';
import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const STATS_FILE = path.join(DATA_DIR, 'notification_stats.json');

const NOTIF_SETTINGS_ID = 'push_notifications_list';
const SUBS_SETTINGS_ID = 'push_subscribers_list';
const STATS_SETTINGS_ID = 'push_notification_stats';

const db = () => supabaseAdmin || supabase;

export interface NotificationServerStats {
  totalSent: number;
  totalSubscribers: number;
  totalClicks: number;
  lastSentAt?: string;
}

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

export const NotificationServerStore = {
  // SUBSCRIBERS
  getSubscribers: async (): Promise<PushSubscriber[]> => {
    if (isSupabaseConfigured()) {
      try {
        const client = db();
        const { data: row, error } = await client
          .from('settings')
          .select('data')
          .eq('id', SUBS_SETTINGS_ID)
          .maybeSingle();

        if (!error && row && Array.isArray(row.data)) {
          return row.data;
        }
      } catch (e) {
        console.warn('Supabase getSubscribers fallback:', e);
      }
    }
    return readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
  },

  addOrUpdateSubscriber: async (sub: PushSubscriber): Promise<{ subscribers: PushSubscriber[]; count: number }> => {
    const list = await NotificationServerStore.getSubscribers();
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

    // Save locally
    writeJson(SUBSCRIBERS_FILE, list);

    // Save to Supabase
    if (isSupabaseConfigured()) {
      try {
        const client = db();
        await client.from('settings').upsert({
          id: SUBS_SETTINGS_ID,
          data: list,
        });
      } catch (e) {
        console.error('Failed to save subscribers to Supabase:', e);
      }
    }

    return { subscribers: list, count: list.length };
  },

  removeSubscriber: async (id: string): Promise<{ count: number }> => {
    const list = await NotificationServerStore.getSubscribers();
    const filtered = list.filter((s) => s.id !== id);

    writeJson(SUBSCRIBERS_FILE, filtered);

    if (isSupabaseConfigured()) {
      try {
        const client = db();
        await client.from('settings').upsert({
          id: SUBS_SETTINGS_ID,
          data: filtered,
        });
      } catch (e) {
        console.error('Failed to remove subscriber in Supabase:', e);
      }
    }

    return { count: filtered.length };
  },

  // NOTIFICATIONS
  getNotifications: async (): Promise<PushNotificationItem[]> => {
    if (isSupabaseConfigured()) {
      try {
        const client = db();
        const { data: row, error } = await client
          .from('settings')
          .select('data')
          .eq('id', NOTIF_SETTINGS_ID)
          .maybeSingle();

        if (!error && row && Array.isArray(row.data)) {
          return row.data;
        }
      } catch (e) {
        console.warn('Supabase getNotifications fallback:', e);
      }
    }
    return readJson<PushNotificationItem[]>(NOTIFICATIONS_FILE, []);
  },

  saveNotifications: async (items: PushNotificationItem[]): Promise<void> => {
    writeJson(NOTIFICATIONS_FILE, items);
    if (isSupabaseConfigured()) {
      try {
        const client = db();
        await client.from('settings').upsert({
          id: NOTIF_SETTINGS_ID,
          data: items,
        });
      } catch (e) {
        console.error('Failed to save notifications to Supabase:', e);
      }
    }
  },

  deleteNotification: async (id: string): Promise<{ count: number }> => {
    const list = await NotificationServerStore.getNotifications();
    const filtered = list.filter((n) => n.id !== id);
    await NotificationServerStore.saveNotifications(filtered);
    return { count: filtered.length };
  },

  clearNotifications: async (): Promise<void> => {
    await NotificationServerStore.saveNotifications([]);
  },

  addNotification: async (item: PushNotificationItem): Promise<{ notification: PushNotificationItem; totalSent: number }> => {
    const list = await NotificationServerStore.getNotifications();
    list.unshift(item);
    await NotificationServerStore.saveNotifications(list);

    // Update Stats
    const stats = await NotificationServerStore.getStats();
    stats.totalSent = (stats.totalSent || 0) + 1;
    stats.lastSentAt = item.sentAt;

    writeJson(STATS_FILE, stats);
    if (isSupabaseConfigured()) {
      try {
        const client = db();
        await client.from('settings').upsert({
          id: STATS_SETTINGS_ID,
          data: stats,
        });
      } catch (e) {
        console.error('Failed to save stats to Supabase:', e);
      }
    }

    return { notification: item, totalSent: stats.totalSent };
  },

  getStats: async (): Promise<NotificationServerStats> => {
    let stats: NotificationServerStats = { totalSent: 0, totalSubscribers: 0, totalClicks: 0 };
    if (isSupabaseConfigured()) {
      try {
        const client = db();
        const { data: row } = await client
          .from('settings')
          .select('data')
          .eq('id', STATS_SETTINGS_ID)
          .maybeSingle();

        if (row && row.data) {
          stats = row.data as NotificationServerStats;
        }
      } catch (e) {
        console.warn('Supabase getStats fallback:', e);
      }
    }
    if (!stats || typeof stats.totalSent !== 'number') {
      stats = readJson<NotificationServerStats>(STATS_FILE, { totalSent: 0, totalSubscribers: 0, totalClicks: 0 });
    }

    const subscribers = await NotificationServerStore.getSubscribers();
    const notifications = await NotificationServerStore.getNotifications();

    return {
      totalSent: Math.max(stats.totalSent || 0, notifications.length),
      totalSubscribers: subscribers.length,
      totalClicks: stats.totalClicks || 0,
      lastSentAt: stats.lastSentAt || (notifications[0] ? notifications[0].sentAt : undefined),
    };
  },
};
