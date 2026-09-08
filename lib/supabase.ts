import { createClient } from '@supabase/supabase-js';
import { UserAccount } from '@/types/prompt';

export const SUPABASE_PROJECT_ID = 'kigytienokbvwetbemac';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const DEFAULT_ANON_KEY = 'sb_publishable_oTJSJYwT3r03WELyu9L3uw_JjtCLqa7';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const isBrowser = typeof window !== 'undefined';

const isBrowser = typeof window !== 'undefined';

// Standard Supabase client (client & server)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
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

export function supabaseUserToUserAccount(u: any, existing?: UserAccount | null): UserAccount {
  const meta = u.user_metadata || {};
  const email = u.email || existing?.email || '';
  const emailPrefix = email ? email.split('@')[0] : 'Creator';
  const name = meta.full_name || meta.name || existing?.name || emailPrefix;
  const username = existing?.username || ('@' + (meta.user_name || emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '') || 'creator'));
  const avatar = meta.avatar_url || meta.picture || existing?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

  return {
    id: u.id,
    name,
    username,
    email,
    joinedDate: existing?.joinedDate || (u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
    isLoggedIn: true,
    avatar,
    points: existing?.points !== undefined ? existing.points : 10,
    requestsMade: existing?.requestsMade || 0,
    likesCountForPoints: existing?.likesCountForPoints || 0,
    savesCountForPoints: existing?.savesCountForPoints || 0,
    generationsCountForPoints: existing?.generationsCountForPoints || 0,
    sharesCountForPoints: existing?.sharesCountForPoints || 0,
    referralsCountForPoints: existing?.referralsCountForPoints || 0,
  };
}
