import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const baseUrl = 'https://geminipromptgenerator.online';

  const staticUrls = [
    { loc: `${baseUrl}`, priority: '1.0', changefreq: 'daily', lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/blog`, priority: '0.8', changefreq: 'daily', lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/privacy-policy`, priority: '0.3', changefreq: 'monthly', lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/terms`, priority: '0.3', changefreq: 'monthly', lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/about`, priority: '0.3', changefreq: 'monthly', lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/contact`, priority: '0.3', changefreq: 'monthly', lastmod: new Date().toISOString() },
  ];

  try {
    const posts = await ServerStorage.getAllPosts();
    const publishedPosts = (posts || []).filter(
      (p) => p && (p.status === 'published' || !p.status)
    );

    const postUrls = publishedPosts.map((post) => {
      const slugOrId = post.slug || post.id;
      const lastModified = post.updatedAt
        ? new Date(post.updatedAt).toISOString()
        : post.createdAt
        ? new Date(post.createdAt).toISOString()
        : new Date().toISOString();

      return {
        loc: `${baseUrl}/post/${encodeURIComponent(slugOrId)}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: lastModified,
      };
    });

    const allUrls = [...staticUrls, ...postUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error generating dynamic sitemap.xml:', err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}</loc></url></urlset>`,
      {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      }
    );
  }
}
