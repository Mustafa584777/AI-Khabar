import { NextRequest, NextResponse } from 'next/server';

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
