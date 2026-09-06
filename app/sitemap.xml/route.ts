import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';
import { BLOG_POSTS } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  imageUrl?: string;
  title?: string;
}

export async function GET() {
  const baseUrl = 'https://geminipromptgenerator.online';
  const now = new Date().toISOString();

  let posts: any[] = [];
  try {
    posts = await ServerStorage.getAllPosts(false);
  } catch (err) {
    console.error('Error fetching posts for sitemap:', err);
  }

  const staticUrls: SitemapEntry[] = [
    { url: `${baseUrl}`, lastmod: now, changefreq: 'daily', priority: '1.0' },
    { url: `${baseUrl}/dashboard`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/blog`, lastmod: now, changefreq: 'daily', priority: '0.8' },
  ];

  const blogUrls: SitemapEntry[] = (BLOG_POSTS || []).map((b) => ({
    url: `${baseUrl}/blog/${b.slug}`,
    lastmod: b.publishedAt ? new Date(b.publishedAt).toISOString() : now,
    changefreq: 'monthly',
    priority: '0.7',
    imageUrl: b.coverImage,
    title: b.title,
  }));

  const promptUrls: SitemapEntry[] = posts.flatMap((p) => {
    const slug = getPromptSlug(p);
    const lastmod = p.updatedAt || p.publishedAt || p.createdAt || now;
    return [
      {
        url: `${baseUrl}/prompt/${slug}`,
        lastmod: typeof lastmod === 'string' ? lastmod : new Date(lastmod).toISOString(),
        changefreq: 'weekly',
        priority: '0.9',
        imageUrl: p.imageUrl,
        title: p.title,
      },
      {
        url: `${baseUrl}/${slug}`,
        lastmod: typeof lastmod === 'string' ? lastmod : new Date(lastmod).toISOString(),
        changefreq: 'weekly',
        priority: '0.9',
        imageUrl: p.imageUrl,
        title: p.title,
      },
    ];
  });

  const allUrls: SitemapEntry[] = [...staticUrls, ...blogUrls, ...promptUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>${
      item.imageUrl
        ? `
    <image:image>
      <image:loc>${escapeXml(item.imageUrl)}</image:loc>
      <image:title>${escapeXml(item.title || 'Prompt Art')}</image:title>
    </image:image>`
        : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
