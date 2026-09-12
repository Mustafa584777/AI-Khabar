import { PushNotificationItem, NotificationPreferences, PushSubscriber } from '@/types/notification';

const STORAGE_KEY_NOTIFICATIONS = 'promptcms_push_notifications';
const STORAGE_KEY_PREFERENCES = 'promptcms_push_preferences';
const STORAGE_KEY_SUBSCRIBERS = 'promptcms_push_subscribers';

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

// Seed notifications styled exactly like Pinterest's viral drops
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
    sentAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
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
    sentAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
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
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
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
  } catch (e) {
    // Ignore audio permission edge-cases
  }
};

export const NotificationService = {
  // Check permission
  getBrowserPermissionStatus: (): NotificationPermission | 'unsupported' => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  // Request browser permission
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

      // Record subscriber
      if (granted) {
        NotificationService.registerSubscriber(prefs.selectedInterests);
      }

      return granted;
    } catch (e) {
      console.error('Failed to request push notification permission:', e);
      return false;
    }
  },

  // Trigger Native Browser Notification
  showNativeNotification: async (item: PushNotificationItem): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      // Play soft chime
      const prefs = NotificationService.getPreferences();
      if (prefs.soundEnabled) {
        playNotificationChime();
      }

      // Try via service worker for richer lockscreen UI
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.showNotification) {
          await registration.showNotification(item.title, {
            body: item.subtitle || item.body,
            icon: '/logo.png',
            badge: '/logo.png',
            image: item.imageUrl || item.collageImages?.[0],
            data: { url: item.url },
            actions: item.actionButtons?.slice(0, 2).map((b) => ({
              action: b.actionKey || 'open',
              title: b.label,
            })),
          } as any);
          return true;
        }
      }

      // Fallback to Window Notification API
      const n = new Notification(item.title, {
        body: item.subtitle || item.body,
        icon: '/logo.png',
        image: item.imageUrl || item.collageImages?.[0],
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

      return true;
    } catch (e) {
      console.error('Failed to show native notification:', e);
      return false;
    }
  },

  // Get notifications
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

  // Filter notifications for user based on selected interests
  getPersonalizedNotifications: (userInterests?: string[]): PushNotificationItem[] => {
    const all = NotificationService.getNotifications();
    const interests = userInterests && userInterests.length > 0
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

  // Add notification (e.g. from Admin or Prompt creation)
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

    const current = NotificationService.getNotifications();
    const updated = [newItem, ...current];
    NotificationService.saveNotifications(updated);

    if (sendNativePush) {
      // Check if user interests match
      const prefs = NotificationService.getPreferences();
      const catLower = (newItem.category || '').toLowerCase();
      const matchesInterest =
        !newItem.category ||
        newItem.category === 'all' ||
        prefs.selectedInterests.some((i) => catLower.includes(i.toLowerCase()) || i.toLowerCase().includes(catLower));

      if (matchesInterest) {
        await NotificationService.showNativeNotification(newItem);
      }
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

  // Push Subscribers
  getSubscribers: (): PushSubscriber[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    // Return mock active subscribers for display
    return [
      {
        id: 'sub-local-1',
        subscribedAt: new Date(Date.now() - 1000 * 3600 * 24 * 3).toISOString(),
        interests: ['Photorealistic & Portraits', 'Anime & Cyberpunk'],
        userAgent: 'Chrome on Android',
      },
      {
        id: 'sub-local-2',
        subscribedAt: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
        interests: ['3D Art & CGI Renders', 'Cinematic & Movie Still'],
        userAgent: 'Safari on iPhone iOS',
      },
    ];
  },

  registerSubscriber: (interests: string[]): void => {
    if (typeof window === 'undefined') return;
    try {
      const subscribers = NotificationService.getSubscribers();
      const currentId = `sub-client-${Date.now()}`;
      const newSub: PushSubscriber = {
        id: currentId,
        subscribedAt: new Date().toISOString(),
        interests,
        userAgent: navigator.userAgent.slice(0, 100),
        lastActiveAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify([newSub, ...subscribers.slice(0, 50)]));
    } catch {
      // ignore
    }
  },
};
