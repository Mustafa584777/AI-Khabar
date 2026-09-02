import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const content = `User-agent: *
Disallow: /cms-login/

Sitemap: https://geminipromptgenerator.online/sitemap.xml`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
