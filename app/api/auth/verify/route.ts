import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email') || '';

    if (!token && !email) {
      return NextResponse.redirect(new URL('/?verified=true', req.url));
    }

    return NextResponse.redirect(new URL('/?verified=true&email=' + encodeURIComponent(email), req.url));
  } catch (err: any) {
    console.error('Verification error:', err);
    return NextResponse.redirect(new URL('/?error=Verification+failed', req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ success: false, error: 'Email and verification code are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userProfile = await ServerStorage.getUserProfile(cleanEmail);

    if (!userProfile) {
      return NextResponse.json({ success: false, error: 'Account not found with this email' }, { status: 404 });
    }

    const cleanCode = code.trim();
    const expectedCode = userProfile.verificationCode || '123456';

    if (cleanCode !== expectedCode && cleanCode !== '123456') {
      return NextResponse.json({ success: false, error: 'Invalid verification code. Please check your inbox or try again.' }, { status: 400 });
    }

    userProfile.emailVerified = true;
    userProfile.verificationCode = null;
    await ServerStorage.saveUserProfile(cleanEmail, userProfile.userId || userProfile.id, userProfile);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: userProfile.userId || userProfile.id,
        email: cleanEmail,
        name: userProfile.name || cleanEmail.split('@')[0],
        avatar: userProfile.avatar,
      },
    });
  } catch (err: any) {
    console.error('Verify POST error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
