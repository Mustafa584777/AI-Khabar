import fs from 'fs';
import path from 'path';
import { PushNotificationItem, PushSubscriber } from '@/types/notification';

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
  getSubscribers: (): PushSubscriber[] => {
    return readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
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
    return { subscribers: list, count: list.length };
  },

  removeSubscriber: (id: string): { count: number } => {
    const list = readJson<PushSubscriber[]>(SUBSCRIBERS_FILE, []);
    const filtered = list.filter((s) => s.id !== id);
    writeJson(SUBSCRIBERS_FILE, filtered);
    return { count: filtered.length };
  },

  // NOTIFICATIONS
  getNotifications: (): PushNotificationItem[] => {
    return readJson<PushNotificationItem[]>(NOTIFICATIONS_FILE, []);
  },

  addNotification: (item: PushNotificationItem): { notification: PushNotificationItem; totalSent: number } => {
    const list = readJson<PushNotificationItem[]>(NOTIFICATIONS_FILE, []);
    list.unshift(item);
    writeJson(NOTIFICATIONS_FILE, list);

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
