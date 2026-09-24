import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/?error=Missing+verification+token', req.url));
    }

    const client = supabaseAdmin || supabase;
    const tokenKey = `verify_token_${token}`;

    const { data: tokenRecord, error: tokenError } = await client
      .from('settings')
      .select('data')
      .eq('id', tokenKey)
      .single();

    if (tokenError || !tokenRecord || !tokenRecord.data) {
      return NextResponse.redirect(new URL('/?error=Invalid+or+expired+verification+token', req.url));
    }

    const { email, userId } = tokenRecord.data;

    if (supabaseAdmin && userId) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
    }

    // Delete used token so it can't be reused
    await client.from('settings').delete().eq('id', tokenKey);

    return NextResponse.redirect(new URL('/?verified=true&email=' + encodeURIComponent(email), req.url));
  } catch (err: any) {
    console.error('Verification error:', err);
    return NextResponse.redirect(new URL('/?error=Verification+failed', req.url));
  }
}
