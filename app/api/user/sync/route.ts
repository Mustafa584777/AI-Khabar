import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing bearer token' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not initialized' }, { status: 500 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const user = userData.user;
    const meta = user.user_metadata || {};

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: meta.full_name || meta.name || user.email?.split('@')[0],
        avatar: meta.avatar_url || meta.picture || meta.avatar || null,
        points: meta.points !== undefined ? Number(meta.points) : 10,
        bookmarks: Array.isArray(meta.bookmarks) ? meta.bookmarks : [],
        likes: Array.isArray(meta.likes) ? meta.likes : [],
        aiHistory: Array.isArray(meta.aiHistory) ? meta.aiHistory : [],
        tasteProfile: meta.tasteProfile || null,
        promptRequests: Array.isArray(meta.promptRequests) ? meta.promptRequests : [],
        requestsMade: meta.requestsMade !== undefined ? Number(meta.requestsMade) : 0,
      },
    });
  } catch (err: any) {
    console.error('User sync GET error:', err);
    return NextResponse.json({ error: err?.message || 'Server error syncing user data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing bearer token' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not initialized' }, { status: 500 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const user = userData.user;
    const currentMeta = user.user_metadata || {};
    const updates = await req.json();

    const newMeta = {
      ...currentMeta,
    };

    if (Array.isArray(updates.bookmarks)) {
      newMeta.bookmarks = updates.bookmarks;
    }
    if (Array.isArray(updates.likes)) {
      newMeta.likes = updates.likes;
    }
    if (updates.points !== undefined) {
      newMeta.points = Number(updates.points);
    }
    if (Array.isArray(updates.aiHistory)) {
      // Keep up to 100 recent AI history items in metadata
      newMeta.aiHistory = updates.aiHistory.slice(0, 100);
    }
    if (updates.tasteProfile !== undefined) {
      newMeta.tasteProfile = updates.tasteProfile;
    }
    if (Array.isArray(updates.promptRequests)) {
      newMeta.promptRequests = updates.promptRequests.slice(0, 50);
    }
    if (updates.requestsMade !== undefined) {
      newMeta.requestsMade = Number(updates.requestsMade);
    }
    if (updates.name) {
      newMeta.full_name = updates.name;
      newMeta.name = updates.name;
    }
    if (updates.avatar) {
      newMeta.avatar = updates.avatar;
      newMeta.avatar_url = updates.avatar;
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: newMeta,
      }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user_metadata: updatedUser?.user?.user_metadata || newMeta,
    });
  } catch (err: any) {
    console.error('User sync POST error:', err);
    return NextResponse.json({ error: err?.message || 'Server error updating user data' }, { status: 500 });
  }
}
