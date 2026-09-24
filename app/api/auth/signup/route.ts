import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import crypto from 'crypto';

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
    const cleanAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

    let userId = '';

    // Helper to initialize user sync record in database (settings table)
    const initUserDatabaseRecord = async (uid: string) => {
      try {
        const client = supabaseAdmin || supabase;
        const syncKey = `user_sync_${uid}`;
        const emailCleanKey = `user_sync_email_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`;

        const initialPayload = {
          userId: uid,
          email: cleanEmail,
          name: cleanName,
          avatar: cleanAvatar,
          points: 10,
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
          updatedAt: new Date().toISOString(),
        };

        await client.from('settings').upsert({ id: syncKey, data: initialPayload });
        await client.from('settings').upsert({ id: emailCleanKey, data: initialPayload });
      } catch (dbErr) {
        console.error('Error initializing user database record:', dbErr);
      }
    };

    // 1. Check if user already exists in Supabase and whether they used Google
    if (supabaseAdmin) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          const isGoogle = existing.app_metadata?.provider === 'google' || 
                           existing.identities?.some((id: any) => id.provider === 'google');
          if (isGoogle) {
            return NextResponse.json({
              success: false,
              isGoogleUser: true,
              error: 'This email is already registered with Google Sign-In. Please click "Continue with Google" to sign in.',
            }, { status: 400 });
          }
        }
      } catch (checkErr) {
        console.warn('Error checking existing user provider:', checkErr);
      }

      // Create user with email unconfirmed (require custom verification workflow)
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: false, // Require email verification via custom token
        user_metadata: {
          full_name: cleanName,
          user_name: cleanUsername,
          avatar_url: cleanAvatar,
          points: 10,
        },
      });

      if (!createError && createData?.user) {
        userId = createData.user.id;
        await initUserDatabaseRecord(userId);

        // Generate unique verification token
        const verificationToken = crypto.randomUUID();
        const tokenKey = `verify_token_${verificationToken}`;
        const client = supabaseAdmin || supabase;
        
        await client.from('settings').upsert({
          id: tokenKey,
          data: {
            email: cleanEmail,
            userId,
            createdAt: new Date().toISOString(),
          }
        });

        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const verificationLink = `${protocol}://${host}/api/auth/verify?token=${verificationToken}`;

        console.log(`[Email Verification] Verification link for ${cleanEmail}: ${verificationLink}`);

        // Send email via Resend API if RESEND_API_KEY is configured
        if (process.env.RESEND_API_KEY) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Prompts App <onboarding@resend.dev>',
                to: [cleanEmail],
                subject: 'Verify your email address',
                html: `<p>Hello ${cleanName},</p><p>Please click the link below to verify your email address and activate your account:</p><p><a href="${verificationLink}">Verify Email</a></p><p>If you did not request this, please ignore this email.</p>`,
              }),
            });
          } catch (resendErr) {
            console.error('Failed to send email via Resend:', resendErr);
          }
        }

        return NextResponse.json({
          success: true,
          needsConfirmation: true,
          message: 'Verification email sent! Please check your inbox to verify your account.',
          user: {
            id: userId,
            email: cleanEmail,
            name: cleanName,
            username: cleanUsername,
            avatar: cleanAvatar,
            points: 10,
          },
        });
      }

      // If user already exists in Supabase (email provider)
      if (createError && (createError.message.includes('already') || createError.status === 422)) {
        return NextResponse.json({
          success: false,
          error: 'An account with this email already exists. Please sign in.',
          alreadyExists: true,
        }, { status: 409 });
      }
    }

    // Fallback: standard client signup
    const { data: fallbackData, error: fallbackError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          user_name: cleanUsername,
          avatar_url: cleanAvatar,
          points: 10,
        },
      },
    });

    if (fallbackError) {
      return NextResponse.json({ success: false, error: fallbackError.message }, { status: 400 });
    }

    userId = fallbackData.user?.id || 'u_' + Date.now();
    await initUserDatabaseRecord(userId);

    const verificationToken = crypto.randomUUID();
    const tokenKey = `verify_token_${verificationToken}`;
    await supabase.from('settings').upsert({
      id: tokenKey,
      data: {
        email: cleanEmail,
        userId,
        createdAt: new Date().toISOString(),
      }
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const verificationLink = `${protocol}://${host}/api/auth/verify?token=${verificationToken}`;

    console.log(`[Email Verification] Fallback verification link for ${cleanEmail}: ${verificationLink}`);

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Prompts App <onboarding@resend.dev>',
            to: [cleanEmail],
            subject: 'Verify your email address',
            html: `<p>Hello ${cleanName},</p><p>Please click the link below to verify your email address:</p><p><a href="${verificationLink}">Verify Email</a></p>`,
          }),
        });
      } catch (resendErr) {
        console.error('Failed to send email via Resend:', resendErr);
      }
    }

    return NextResponse.json({
      success: true,
      needsConfirmation: true,
      message: 'Verification email sent! Please check your inbox to verify your account.',
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
    console.error('Signup error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to sign up' }, { status: 500 });
  }
}
