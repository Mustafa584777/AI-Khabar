export interface PushNotificationAction {
  label: string;
  url: string;
  actionKey?: string;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  subtitle?: string; // e.g. "You might like these searches"
  category: string; // e.g. 'all' | 'Photorealistic & Portraits' | 'Anime & Cyberpunk' | etc.
  targetTags?: string[];
  imageUrl?: string; // Main image or first collage card
  collageImages?: string[]; // Up to 4 images for the Pinterest 4-card strip collage!
  url: string; // Destination URL e.g. "/cyberpunk-neon-portrait" or "/explore"
  actionButtons?: PushNotificationAction[];
  sentAt: string; // ISO string
  sentBy?: 'admin' | 'automated' | string;
  clicksCount?: number;
  read?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  browserPushGranted: boolean;
  selectedInterests: string[]; // User-selected categories e.g. ['Photorealistic & Portraits', 'Anime & Cyberpunk']
  frequency: 'instant' | 'daily' | 'weekly';
  soundEnabled: boolean;
}

export interface UserNotificationPreferences {
  enabledCategories: string[];
  browserPushEnabled: boolean;
  soundEnabled: boolean;
  selectedInterests?: string[];
  frequency?: 'instant' | 'daily' | 'weekly';
}

export interface PushSubscriber {
  id: string;
  endpoint?: string;
  subscribedAt: string;
  interests: string[];
  userAgent?: string;
  lastActiveAt?: string;
}
