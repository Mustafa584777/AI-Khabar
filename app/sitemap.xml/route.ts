import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await ServerStorage.getAllPosts(false); // Only published posts
  
  const baseUrl = 'https://geminipromptgenerator.online';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  posts.forEach((post) => {
    const slug = getPromptSlug(post);
    xml += `  <url>
    <loc>${baseUrl}/prompt/${slug}</loc>
    <lastmod>${new Date(post.updatedAt || post.createdAt || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  });

  xml += `</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
