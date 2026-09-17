import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_ID = 'kigytienokbvwetbemac';
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_ANON_KEY = 'sb_publishable_oTJSJYwT3r03WELyu9L3uw_JjtCLqa7';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

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
