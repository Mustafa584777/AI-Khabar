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

// Seed notifications styled like Pinterest's viral drops
export const SEED_NOTIFICATIONS: PushNotificationItem[] = [
  {
    id: 'notif-pinterest-pink-viral',
    title: 'Why is Pink Background everywhere right now?',
    subtitle: 'You might like these searches',
    body: 'Explore high-contrast aesthetics, vaporwave aesthetics, and pastel glow prompts dominating Pinterest and Instagram.',
    category: 'Photorealistic & Portraits',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    collageImages: [
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
    ],
    url: '/explore?q=pink+aesthetic',
    actionButtons: [
      { label: 'Explore Searches', url: '/explore?q=pink+aesthetic' },
      { label: 'Try in Studio', url: '/create' },
    ],
    sentAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    sentBy: 'admin',
    clicksCount: 142,
    read: false,
  },
  {
    id: 'notif-cyberpunk-neon-drop',
    title: 'Neon Cyberpunk 8K: Master Prompts Just Dropped',
    subtitle: 'Trending in Anime & Cyberpunk',
    body: 'Top photorealistic prompts with rainy reflections, volumetric neon lighting, and cinematic Sony A7 IV depth of field.',
    category: 'Anime & Cyberpunk',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    collageImages: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    ],
    url: '/explore?category=Anime+%26+Cyberpunk',
    actionButtons: [
      { label: 'Copy Prompts', url: '/explore?category=Anime+%26+Cyberpunk' },
      { label: 'AI Generator', url: '/create' },
    ],
    sentAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    sentBy: 'admin',
    clicksCount: 389,
    read: false,
  },
  {
    id: 'notif-3d-character-unreal',
    title: 'Unreal Engine 5 Character Renders are Blowing Up',
    subtitle: 'You might like these prompt ideas',
    body: 'Curated 3D hyper-detailed figures with Octane clay shading, subsurface scattering, and isometric perspective.',
    category: '3D Art & CGI Renders',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    collageImages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    ],
    url: '/explore?category=3D+Art+%26+CGI+Renders',
    actionButtons: [
      { label: 'View Gallery', url: '/explore?category=3D+Art+%26+CGI+Renders' },
    ],
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    sentBy: 'admin',
    clicksCount: 512,
    read: true,
  },
];

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

// Category normalization helper
export const normalizeCategory = (cat: string): string => {
  return (cat || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[\s\-_+]+/g, ' ')
    .trim();
};

// Strict check whether notification category matches user selected interests
export const isCategoryMatchingInterest = (
  notifCategory: string | undefined | null,
  userInterests: string[]
): boolean => {
  if (!notifCategory) return false;
  const normNotif = normalizeCategory(notifCategory);

  // Global broadcast to all users
  if (normNotif === 'all' || normNotif === 'global' || normNotif === 'broadcast' || normNotif === 'everyone') {
    return true;
  }

  if (!userInterests || userInterests.length === 0) {
    return false;
  }

  return userInterests.some((interest) => {
    if (!interest) return false;
    const normUserInt = normalizeCategory(interest);
    if (!normUserInt) return false;

    // 1. Exact match
    if (normNotif === normUserInt) return true;

    // 2. Contains (min 3 chars to prevent false positives)
    if (normUserInt.length >= 3 && normNotif.includes(normUserInt)) return true;
    if (normNotif.length >= 3 && normUserInt.includes(normNotif)) return true;

    // 3. Sub-parts split by '&', 'and', '/', ','
    const notifParts = normNotif.split(/\s*(?:&|\band\b|\/|,)\s*/).filter((p) => p.length >= 3);
    const userParts = normUserInt.split(/\s*(?:&|\band\b|\/|,)\s*/).filter((p) => p.length >= 3);

    for (const np of notifParts) {
      for (const up of userParts) {
        if (np === up || (np.length >= 4 && up.length >= 4 && (np.includes(up) || up.includes(np)))) {
          return true;
        }
      }
    }

    return false;
  });
};

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

  // Check if running inside an iframe (e.g. preview environment)
  isInsideIframe: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  },

  // Request browser permission and register subscriber with backend
  requestPushPermission: async (): Promise<{
    status: NotificationPermission | 'unsupported';
    isIframe: boolean;
  }> => {
    if (typeof window === 'undefined') {
      return { status: 'unsupported', isIframe: false };
    }

    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }

    if (!('Notification' in window)) {
      return { status: 'unsupported', isIframe };
    }

    let permission = Notification.permission;

    // If permission is 'default' and not yet decided, invoke browser request
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        try {
          permission = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission(resolve);
          });
        } catch (cbErr) {
          console.warn('requestPermission callback error:', cbErr);
        }
      }
    }

    const granted = permission === 'granted';

    // Update preferences with REAL permission state
    const prefs = NotificationService.getPreferences();
    prefs.browserPushGranted = granted;
    NotificationService.savePreferences(prefs);

    // Register Service Worker and server subscriber ONLY when truly granted
    if (granted) {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (swErr) {
          console.warn('SW registration warning:', swErr);
        }
      }
      await NotificationService.registerSubscriber(prefs.selectedInterests);
    }

    return { status: permission, isIframe };
  },

  // Trigger Native Browser Notification Popup
  showNativeNotification: async (item: PushNotificationItem): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Play soft chime if enabled
      const prefs = NotificationService.getPreferences();
      if (prefs.soundEnabled) {
        playNotificationChime();
      }

      const iconPath = `${window.location.origin}/logo.png`;
      const badgePath = iconPath;

      // Ensure 16:9 composite banner image (handles 4 collage images or 1 image in 16:9)
      let displayImage = item.imageUrl || '';
      if (item.collageImages && item.collageImages.length > 1) {
        if (item.id) {
          displayImage = `/api/notifications/collage?id=${encodeURIComponent(item.id)}`;
        } else {
          displayImage = `/api/notifications/collage?urls=${encodeURIComponent(item.collageImages.slice(0, 4).join(','))}`;
        }
      } else if (displayImage && !displayImage.includes('/api/notifications/collage')) {
        // Route single image through 16:9 collage endpoint to enforce 16:9 aspect ratio
        if (item.id) {
          displayImage = `/api/notifications/collage?id=${encodeURIComponent(item.id)}`;
        } else if (displayImage.startsWith('http')) {
          displayImage = `/api/notifications/collage?urls=${encodeURIComponent(displayImage)}`;
        }
      }

      // Guarantee absolute URL for service worker and browser notification engine
      if (!displayImage) {
        displayImage = iconPath;
      } else if (displayImage.startsWith('/')) {
        displayImage = `${window.location.origin}${displayImage}`;
      }

      let shown = false;

      // 1. Try Service Worker showNotification if permitted
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
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
              payload: {
                ...item,
                imageUrl: displayImage,
                image: displayImage,
              },
            });
            shown = true;
          }
        } catch (swErr) {
          console.warn('Service worker showNotification fallback:', swErr);
        }
      }

      // Also dispatch in-app window event so floating banner notifications appear in the UI
      window.dispatchEvent(
        new CustomEvent('promptcms_native_popup', {
          detail: {
            ...item,
            imageUrl: displayImage,
          },
        })
      );

      return true;
    } catch (e) {
      console.error('Failed to show native notification:', e);
      return false;
    }
  },

  // Handle incoming real notification from server or BroadcastChannel
  handleIncomingRealNotification: async (item: PushNotificationItem) => {
    const list = NotificationService.getNotifications();
    if (list.some((n) => n.id === item.id)) return; // Already have it

    const prefs = NotificationService.getPreferences();
    const matchesInterest = isCategoryMatchingInterest(item.category, prefs.selectedInterests);

    // If notification category DOES NOT MATCH user's selected interests:
    // Do NOT trigger browser push, do NOT pop up banner, do NOT pollute feed!
    if (!matchesInterest) {
      return;
    }

    // User is subscribed to this category: Prepend to local feed
    const updated = [item, ...list];
    NotificationService.saveNotifications(updated);

    // Check if user allows push and trigger native push
    if (prefs.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      await NotificationService.showNativeNotification(item);
    }

    // Trigger UI refresh event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('promptcms_new_notification', { detail: item }));
    }
  },

  // Sync with Server (fetches any newly broadcasted notifications)
  syncWithServer: async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const lastSyncStr = localStorage.getItem(STORAGE_KEY_LAST_SYNC) || '0';
      const prefs = NotificationService.getPreferences();
      const interestsParam = encodeURIComponent((prefs.selectedInterests || []).join(','));
      const res = await fetch(`/api/notifications/latest?since=${lastSyncStr}&interests=${interestsParam}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        for (const notif of data.notifications) {
          await NotificationService.handleIncomingRealNotification(notif);
        }
        if (data.timestamp) {
          localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(data.timestamp));
        }
      }
    } catch {
      // Ignore background sync errors
    }
  },

  // Get notifications from local storage
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

  // Save notifications
  saveNotifications: (items: PushNotificationItem[]): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving notifications:', e);
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

    return all.filter((n) => isCategoryMatchingInterest(n.category, interests));
  },

  // Broadcast & Add notification (e.g. from Admin or Prompt creation)
  addNotification: async (
    item: Omit<PushNotificationItem, 'id' | 'sentAt' | 'clicksCount' | 'read'> & { id?: string },
    sendNativePush = true
  ): Promise<PushNotificationItem> => {
    const notifId = item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const validCollage = Array.isArray(item.collageImages)
      ? item.collageImages.filter((u) => u && typeof u === 'string' && u.trim().length > 0).slice(0, 4)
      : [];

    const effectiveImageUrl =
      validCollage.length > 1 || item.imageUrl
        ? `/api/notifications/collage?id=${notifId}`
        : item.imageUrl || '';

    const newItem: PushNotificationItem = {
      ...item,
      id: notifId,
      imageUrl: effectiveImageUrl || item.imageUrl,
      collageImages: validCollage.length > 0 ? validCollage : item.imageUrl ? [item.imageUrl] : [],
      sentAt: new Date().toISOString(),
      clicksCount: 0,
      read: false,
    };

    // Save locally
    const current = NotificationService.getNotifications();
    const updated = [newItem, ...current.filter((n) => n.id !== newItem.id)];
    NotificationService.saveNotifications(updated);

    // Broadcast across tabs on same device
    if (pushChannel) {
      try {
        pushChannel.postMessage({ type: 'NEW_NOTIFICATION', item: newItem });
      } catch {
        // ignore
      }
    }

    // STRICT CHECK: Only pop up native notification if this user has enabled push AND the notification category matches their selected interests!
    if (sendNativePush && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const prefs = NotificationService.getPreferences();
      const matches = isCategoryMatchingInterest(newItem.category, prefs.selectedInterests);
      if (prefs.enabled && matches) {
        await NotificationService.showNativeNotification(newItem);
      }
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

  deleteNotification: (id: string): void => {
    const list = NotificationService.getNotifications();
    const updated = list.filter((n) => n.id !== id);
    NotificationService.saveNotifications(updated);
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
