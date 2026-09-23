import { createClient } from '@supabase/supabase-js';
import { UserAccount } from '@/types/prompt';

export const SUPABASE_PROJECT_ID = 'kigytienokbvwetbemac';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const DEFAULT_ANON_KEY = 'sb_publishable_oTJSJYwT3r03WELyu9L3uw_JjtCLqa7';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Standard Supabase client (client & server)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Admin Supabase client with service role key if provided, else fallback to anon key
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseDetails() {
  return {
    url: supabaseUrl,
    projectId: SUPABASE_PROJECT_ID,
    hasKey: Boolean(supabaseAnonKey),
  };
}

export function supabaseUserToUserAccount(user: any, existing?: UserAccount | null): UserAccount {
  return {
    id: user.id || existing?.id || 'u_guest',
    name: user.user_metadata?.name || existing?.name || user.email?.split('@')[0] || 'User',
    username: user.user_metadata?.username || existing?.username || '@' + (user.email?.split('@')[0] || 'user'),
    email: user.email || existing?.email || '',
    joinedDate: existing?.joinedDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    isLoggedIn: true,
    avatar: user.user_metadata?.avatar_url || existing?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    points: existing?.points ?? 10,
    requestsMade: existing?.requestsMade ?? 0,
    likesCountForPoints: existing?.likesCountForPoints ?? 0,
    savesCountForPoints: existing?.savesCountForPoints ?? 0,
    generationsCountForPoints: existing?.generationsCountForPoints ?? 0,
    sharesCountForPoints: existing?.sharesCountForPoints ?? 0,
    referralsCountForPoints: existing?.referralsCountForPoints ?? 0,
    toolCredits: existing?.toolCredits ?? 10,
    planTier: existing?.planTier || 'free',
    isProUser: existing?.isProUser ?? false,
  };
}
