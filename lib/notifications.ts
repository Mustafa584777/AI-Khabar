import { PushNotificationItem, NotificationPreferences, PushSubscriber } from '@/types/notification';

const STORAGE_KEY_NOTIFICATIONS = 'promptcms_push_notifications';
const STORAGE_KEY_PREFERENCES = 'promptcms_push_preferences';
const STORAGE_KEY_SUBSCRIBERS = 'promptcms_push_subscribers';
const STORAGE_KEY_CLIENT_ID = 'promptcms_subscriber_client_id';
const STORAGE_KEY_LAST_SYNC = 'promptcms_last_sync_timestamp';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  browserPushGranted: false,
  selectedInterests: [
    'Photorealistic & Portraits',
    'Anime & Cyberpunk',
    '3D Art & CGI Renders',
    'Cinematic & Movie Still',
  ],
  frequency: 'instant',
  soundEnabled: true,
};

// Seed notifications styled like viral drops
export const SEED_NOTIFICATIONS: PushNotificationItem[] = [];

// Play soft ambient notification chime using Web Audio API
export const playNotificationChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.25); // E6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.4);
  } catch {
    // Ignore audio permission edge-cases
  }
};

// Global cross-tab channel
let pushChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    pushChannel = new BroadcastChannel('auraprompt_push_events');
    pushChannel.onmessage = (event) => {
      if (event.data?.type === 'NEW_NOTIFICATION' && event.data.item) {
        NotificationService.handleIncomingRealNotification(event.data.item);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }
}

export const NotificationService = {
  // Get subscriber client ID
  getClientSubscriberId: (): string => {
    if (typeof window === 'undefined') return 'sub-ssr';
    let id = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (!id) {
      id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(STORAGE_KEY_CLIENT_ID, id);
    }
    return id;
  },

  // Check browser permission status
  getBrowserPermissionStatus: (): NotificationPermission | 'unsupported' => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  // Request browser permission and register subscriber with backend
  requestPushPermission: async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';

      // Update preferences
      const prefs = NotificationService.getPreferences();
      prefs.browserPushGranted = granted;
      NotificationService.savePreferences(prefs);

      // Register Service Worker if granted
      if (granted && 'serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (swErr) {
          console.warn('SW registration warning:', swErr);
        }
      }

      // Record subscriber on server
      if (granted) {
        await NotificationService.registerSubscriber(prefs.selectedInterests);
      }

      return granted;
    } catch (e) {
      console.error('Failed to request push notification permission:', e);
      return false;
    }
  },

  // Trigger Native Browser Notification Popup
  showNativeNotification: async (item: PushNotificationItem): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      // Play soft chime if enabled
      const prefs = NotificationService.getPreferences();
      if (prefs.soundEnabled) {
        playNotificationChime();
      }

      const iconPath = '/logo.png';
      const badgePath = '/logo.png';
      const displayImage = item.imageUrl || item.collageImages?.[0] || '/logo.png';

      let shown = false;

      // 1. Try Service Worker showNotification first
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.showNotification) {
            await registration.showNotification(item.title, {
              body: item.subtitle || item.body,
              icon: iconPath,
              badge: badgePath,
              image: displayImage,
              data: { url: item.url },
              actions: item.actionButtons?.slice(0, 2).map((b) => ({
                action: b.actionKey || 'open',
                title: b.label,
              })),
            } as any);
            shown = true;
          } else if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: item,
            });
            shown = true;
          }
        } catch (swErr) {
          console.warn('Service worker showNotification fallback:', swErr);
        }
      }

      // 2. Fallback to Window Notification API
      if (!shown && typeof Notification !== 'undefined') {
        try {
          const n = new Notification(item.title, {
            body: item.subtitle || item.body,
            icon: iconPath,
            image: displayImage,
            data: { url: item.url },
          } as any);

          n.onclick = (e) => {
            e.preventDefault();
            window.focus();
            if (item.url) {
              window.location.href = item.url;
            }
            n.close();
          };
          shown = true;
        } catch (winErr) {
          console.warn('Window Notification failed:', winErr);
        }
      }

      return shown;
    } catch (e) {
      console.error('Failed to show native notification:', e);
      return false;
    }
  },

  // Handle incoming real notification from server or BroadcastChannel
  handleIncomingRealNotification: async (item: PushNotificationItem) => {
    const list = NotificationService.getNotifications();
    if (list.some((n) => n.id === item.id)) return; // Already have it

    // Prepend to local feed
    const updated = [item, ...list];
    NotificationService.saveNotifications(updated);

    // Check if user allows push and matches interests
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const prefs = NotificationService.getPreferences();
      const catLower = (item.category || '').toLowerCase();
      const matchesInterest =
        !item.category ||
        item.category === 'all' ||
        prefs.selectedInterests.some(
          (i) => catLower.includes(i.toLowerCase()) || i.toLowerCase().includes(catLower)
        );

      if (matchesInterest) {
        await NotificationService.showNativeNotification(item);
      }
    }

    // Trigger UI refresh event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('promptcms_new_notification', { detail: item }));
    }
  },

  // Sync with Server (fetches notifications from Supabase backend)
  syncWithServer: async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/notifications/send');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(data.notifications));
          window.dispatchEvent(new CustomEvent('promptcms_new_notification'));
        }
      }
    } catch {
      // Ignore background sync errors
    }
  },

  // Get notifications from local storage cache
  getNotifications: (): PushNotificationItem[] => {
    if (typeof window === 'undefined') return SEED_NOTIFICATIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
    return SEED_NOTIFICATIONS;
  },

  // Save notifications locally and sync with Supabase
  saveNotifications: async (items: PushNotificationItem[]): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(items));
      await fetch('/api/notifications/send', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: items }),
      });
    } catch (e) {
      console.error('Error saving notifications to Supabase:', e);
    }
  },

  // Filter notifications based on user selected interests
  getPersonalizedNotifications: (userInterests?: string[]): PushNotificationItem[] => {
    const all = NotificationService.getNotifications();
    const interests =
      userInterests && userInterests.length > 0
        ? userInterests
        : NotificationService.getPreferences().selectedInterests;

    if (!interests || interests.length === 0) return all;

    const lowerInterests = interests.map((i) => i.toLowerCase());

    return all.filter((n) => {
      if (!n.category || n.category === 'all') return true;
      const catLower = n.category.toLowerCase();
      return lowerInterests.some((i) => catLower.includes(i) || i.includes(catLower));
    });
  },

  // Broadcast & Add notification (e.g. from Admin or Prompt creation)
  addNotification: async (
    item: Omit<PushNotificationItem, 'id' | 'sentAt' | 'clicksCount' | 'read'>,
    sendNativePush = true
  ): Promise<PushNotificationItem> => {
    const newItem: PushNotificationItem = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sentAt: new Date().toISOString(),
      clicksCount: 0,
      read: false,
    };

    // Save locally
    const current = NotificationService.getNotifications();
    const updated = [newItem, ...current];
    NotificationService.saveNotifications(updated);

    // Broadcast across tabs on same device
    if (pushChannel) {
      try {
        pushChannel.postMessage({ type: 'NEW_NOTIFICATION', item: newItem });
      } catch {
        // ignore
      }
    }

    // Show native push on current device if permitted
    if (sendNativePush && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      await NotificationService.showNativeNotification(newItem);
    }

    // Trigger UI refresh event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('promptcms_new_notification', { detail: newItem }));
    }

    return newItem;
  },

  markAsRead: (id: string): void => {
    const list = NotificationService.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    NotificationService.saveNotifications(updated);
  },

  markAllAsRead: (): void => {
    const list = NotificationService.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    NotificationService.saveNotifications(updated);
  },

  deleteNotification: async (id: string): Promise<void> => {
    const list = NotificationService.getNotifications();
    const updated = list.filter((n) => n.id !== id);
    NotificationService.saveNotifications(updated);
    try {
      await fetch(`/api/notifications/send?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Failed to delete notification on server:', e);
    }
  },

  recordNotificationClick: (id: string): void => {
    const list = NotificationService.getNotifications();
    const updated = list.map((n) =>
      n.id === id ? { ...n, clicksCount: (n.clicksCount || 0) + 1, read: true } : n
    );
    NotificationService.saveNotifications(updated);
  },

  // Preferences
  getPreferences: (): NotificationPreferences => {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...parsed,
          browserPushGranted:
            typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false,
        };
      }
    } catch (e) {
      console.error('Error reading push preferences:', e);
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
  },

  savePreferences: (prefs: NotificationPreferences): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(prefs));
    } catch (e) {
      console.error('Error saving push preferences:', e);
    }
  },

  // Push Subscribers (Sync with server for real admin metrics)
  fetchRealSubscribers: async (): Promise<{ subscribers: PushSubscriber[]; count: number }> => {
    try {
      const res = await fetch('/api/notifications/subscribe');
      if (res.ok) {
        const data = await res.json();
        return {
          subscribers: data.subscribers || [],
          count: data.count || (data.subscribers ? data.subscribers.length : 0),
        };
      }
    } catch (e) {
      console.error('Failed to fetch real subscribers from server:', e);
    }
    return { subscribers: [], count: 0 };
  },

  fetchRealStats: async (): Promise<{ totalSent: number; totalSubscribers: number; totalClicks: number }> => {
    try {
      const res = await fetch('/api/notifications/send');
      if (res.ok) {
        const data = await res.json();
        return data.stats || { totalSent: 0, totalSubscribers: 0, totalClicks: 0 };
      }
    } catch (e) {
      console.error('Failed to fetch real stats from server:', e);
    }
    return { totalSent: 0, totalSubscribers: 0, totalClicks: 0 };
  },

  // Register real subscriber on server and locally
  registerSubscriber: async (interests: string[]): Promise<void> => {
    if (typeof window === 'undefined') return;
    const clientSubscriberId = NotificationService.getClientSubscriberId();

    try {
      // 1. Send to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: clientSubscriberId,
          interests,
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.subscriber) {
          // Store locally
          const currentSubs = NotificationService.getSubscribers();
          const filtered = currentSubs.filter((s) => s.id !== clientSubscriberId);
          localStorage.setItem(
            STORAGE_KEY_SUBSCRIBERS,
            JSON.stringify([data.subscriber, ...filtered])
          );
        }
      }
    } catch (e) {
      console.error('Failed to register subscriber with server:', e);
    }
  },

  getSubscribers: (): PushSubscriber[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  },
};
