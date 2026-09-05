export const dynamic = 'force-dynamic';

export async function GET() {
  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://geminipromptgenerator.online/sitemap.xml
`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
