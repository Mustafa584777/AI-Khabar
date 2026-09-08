import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try standard sign in with password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (!signInError && signInData?.session) {
      return NextResponse.json({
        success: true,
        session: signInData.session,
        user: signInData.user,
      });
    }

    // 2. If error is "Email not confirmed", auto-confirm via admin client and retry
    if (
      signInError &&
      (signInError.message.toLowerCase().includes('not confirmed') ||
        signInError.message.toLowerCase().includes('confirm'))
    ) {
      if (supabaseAdmin) {
        try {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const found = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (found) {
            await supabaseAdmin.auth.admin.updateUserById(found.id, { email_confirm: true });

            // Retry signInWithPassword
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });

            if (!retryError && retryData?.session) {
              return NextResponse.json({
                success: true,
                session: retryData.session,
                user: retryData.user,
              });
            }
          }
        } catch (adminErr) {
          console.error('Auto-confirm retry error:', adminErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: signInError?.message || 'Invalid email or password',
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
