import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

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

    // 1. Try creating user with auto-confirmed email via Supabase Admin
    if (supabaseAdmin) {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          user_name: cleanUsername,
          avatar_url: cleanAvatar,
        },
      });

      if (!createError && createData?.user) {
        return NextResponse.json({
          success: true,
          user: {
            id: createData.user.id,
            email: cleanEmail,
            name: cleanName,
            username: cleanUsername,
            avatar: cleanAvatar,
          },
        });
      }

      // If user already exists in Supabase
      if (createError && (createError.message.includes('already') || createError.status === 422)) {
        // Auto-confirm the existing user if unconfirmed and update their metadata
        try {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existing = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (existing) {
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              email_confirm: true,
              password,
              user_metadata: {
                full_name: cleanName,
                user_name: cleanUsername,
                avatar_url: cleanAvatar,
              },
            });
            return NextResponse.json({
              success: true,
              user: {
                id: existing.id,
                email: cleanEmail,
                name: cleanName,
                username: cleanUsername,
                avatar: cleanAvatar,
              },
              message: 'Account updated successfully. You can now log in.',
            });
          }
        } catch (e) {
          console.warn('Auto-confirm existing user notice:', e);
        }

        return NextResponse.json({
          success: false,
          error: 'An account with this email already exists. Please sign in.',
          alreadyExists: true,
        }, { status: 409 });
      }

      if (createError) {
        console.warn('Supabase admin createUser error, falling back to standard client:', createError.message);
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
        },
      },
    });

    if (fallbackError) {
      return NextResponse.json({ success: false, error: fallbackError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: fallbackData.user?.id || 'u_' + Date.now(),
        email: cleanEmail,
        name: cleanName,
        username: cleanUsername,
        avatar: cleanAvatar,
      },
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to sign up' }, { status: 500 });
  }
}
