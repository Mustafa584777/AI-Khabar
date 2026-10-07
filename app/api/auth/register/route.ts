import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name || cleanEmail.split('@')[0]).trim();

    const existing = await ServerStorage.getUserProfile(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please switch to Log In.' },
        { status: 409 }
      );
    }

    const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userRecord = {
      userId,
      id: userId,
      email: cleanEmail,
      name: displayName,
      username: `@${cleanEmail.split('@')[0]}`,
      passwordHash: password,
      points: 10,
      toolCredits: 5,
      savesLimit: 10,
      aiSearchRemaining: 5,
      promptRequestsRemaining: 0,
      unlockedPromptIds: [],
      signupCreditsAwarded: true,
      signupBonusClaimed: true,
      bookmarkedIds: [],
      likedIds: [],
      aiHistory: [],
      promptRequests: [],
      joinedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ServerStorage.saveUserProfile(cleanEmail, userId, userRecord);

    return NextResponse.json({
      success: true,
      message: 'Account created and verified successfully.',
      user: {
        id: userId,
        email: cleanEmail,
      },
    });
  } catch (err: any) {
    console.error('Register route error:', err);
    return NextResponse.json({ error: err.message || 'Server error during registration' }, { status: 500 });
  }
}
