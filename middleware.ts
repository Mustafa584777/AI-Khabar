import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/Ads.txt' || request.nextUrl.pathname === '/ADS.TXT') {
    return NextResponse.redirect(new URL('/ads.txt', request.url), 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/Ads.txt', '/ADS.TXT'],
};
