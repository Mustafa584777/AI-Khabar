import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const settings = await ServerStorage.getSettings().catch(() => null);
    const baseUrl = 'https://geminipromptgenerator.online';

    // Fetch all live posts directly from database / storage
    const publishedPosts = await ServerStorage.getAllPosts(false).catch(() => []);

    const currentDate = new Date().toISOString().split('T')[0];

    // Build XML string
    const xmlEntries: string[] = [
      `  <url>`,
      `    <loc>${baseUrl}</loc>`,
      `    <lastmod>${currentDate}</lastmod>`,
      `    <changefreq>daily</changefreq>`,
      `    <priority>1.0</priority>`,
      `  </url>`,
      `  <url>`,
      `    <loc>${baseUrl}/blog</loc>`,
      `    <lastmod>${currentDate}</lastmod>`,
      `    <changefreq>daily</changefreq>`,
      `    <priority>0.8</priority>`,
      `  </url>`,
    ];

    // Dynamically include every prompt URL
    for (const post of publishedPosts) {
      const postSlug = encodeURIComponent(post.slug.trim());
      const postDate = post.createdAt
        ? new Date(post.createdAt).toISOString().split('T')[0]
        : currentDate;

      xmlEntries.push(
        `  <url>`,
        `    <loc>${baseUrl}/${postSlug}</loc>`,
        `    <lastmod>${postDate}</lastmod>`,
        `    <changefreq>weekly</changefreq>`,
        `    <priority>0.9</priority>`,
        `  </url>`
      );
    }

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries.join('\n')}
</urlset>`.trim();

    return new NextResponse(sitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating dynamic sitemap.xml:', error);
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://geminipromptgenerator.online</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}
