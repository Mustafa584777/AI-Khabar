import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name || cleanEmail.split('@')[0]).trim();

    // If supabaseAdmin is available (service role key configured), create with email_confirm: true
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          name: displayName,
          points: 10,
          bookmarks: [],
          likes: [],
          aiHistory: [],
          promptRequests: [],
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')
        ) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please switch to Log In.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Account created and verified successfully.',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: displayName,
            points: 10,
            bookmarks: [],
            likes: [],
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        user: data.user,
      });
    }
  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json({ error: err?.message || 'Server registration error' }, { status: 500 });
  }
}
