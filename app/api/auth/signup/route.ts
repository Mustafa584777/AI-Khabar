import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username, avatar } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ success: false, error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const cleanUsername = username?.trim() || ('@' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const cleanAvatar =
      avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

    // Check if user already exists
    const existing = await ServerStorage.getUserProfile(cleanEmail);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists. Please sign in.',
          alreadyExists: true,
        },
        { status: 409 }
      );
    }

    const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const initialPayload = {
      userId,
      id: userId,
      email: cleanEmail,
      name: cleanName,
      username: cleanUsername,
      avatar: cleanAvatar,
      passwordHash: password,
      points: 10,
      planTier: 'free',
      isProUser: false,
      toolCredits: 5,
      savesLimit: 10,
      aiSearchRemaining: 5,
      promptRequestsRemaining: 0,
      unlockedPromptIds: [],
      signupCreditsAwarded: true,
      signupBonusClaimed: true,
      signupModalShown: false,
      bookmarkedIds: [],
      likedIds: [],
      aiHistory: [],
      tasteProfile: {
        genderVibe: 'all',
        favoriteStyles: ['Cinematic', 'Portrait', '35mm'],
        favoriteTools: ['Midjourney', 'Stable Diffusion', 'DALL-E 3'],
        categoryAffinities: {},
        tagAffinities: {},
        toolAffinities: {},
        clickedPostIds: {},
        copiedPostIds: [],
        lastUpdated: new Date().toISOString(),
      },
      joinedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save user record directly to Firebase Firestore & local storage
    await ServerStorage.saveUserProfile(cleanEmail, userId, initialPayload);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: userId,
        email: cleanEmail,
        name: cleanName,
        username: cleanUsername,
        avatar: cleanAvatar,
        points: 10,
      },
    });
  } catch (err: any) {
    console.error('Signup route error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
