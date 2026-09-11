import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserNotificationPreferences } from '@/types/prompt';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  enabledCategories: ['all'],
  browserPushEnabled: false,
  soundEnabled: true,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: true, preferences: DEFAULT_PREFERENCES });
    }

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', `notif_pref_${userId}`)
        .maybeSingle();

      if (data && data.data) {
        return NextResponse.json({ success: true, preferences: data.data });
      }
    }

    return NextResponse.json({ success: true, preferences: DEFAULT_PREFERENCES });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, preferences } = body;

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences are required' }, { status: 400 });
    }

    if (userId && isSupabaseConfigured()) {
      await supabase.from('settings').upsert({
        id: `notif_pref_${userId}`,
        data: preferences,
      }, { onConflict: 'id' });
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
