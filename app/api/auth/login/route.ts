import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userProfile = await ServerStorage.getUserProfile(cleanEmail);

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email. Please sign up first.' },
        { status: 404 }
      );
    }

    // Verify password if passwordHash was saved, otherwise accept valid registered user
    if (userProfile.passwordHash && userProfile.passwordHash !== password) {
      return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.userId || userProfile.id || `u_${Date.now()}`,
        email: cleanEmail,
        user_metadata: {
          full_name: userProfile.name || cleanEmail.split('@')[0],
          name: userProfile.name || cleanEmail.split('@')[0],
          avatar_url: userProfile.avatar,
        },
      },
    });
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
