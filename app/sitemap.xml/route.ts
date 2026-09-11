import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';
import { BLOG_POSTS } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  // 1. Homepage & Essential Policy Pages
  const staticUrls: SitemapEntry[] = [
    { url: `${baseUrl}`, lastmod: now, changefreq: 'daily', priority: '1.0' },
    { url: `${baseUrl}/contact`, lastmod: now, changefreq: 'monthly', priority: '0.7' },
    { url: `${baseUrl}/privacy-policy`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
    { url: `${baseUrl}/disclaimer`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
    { url: `${baseUrl}/blog`, lastmod: now, changefreq: 'daily', priority: '0.8' },
  ];

  // 2. Blog Articles
  const blogUrls: SitemapEntry[] = (BLOG_POSTS || []).map((b) => ({
    url: `${baseUrl}/blog/${b.slug}`,
    lastmod: b.publishedAt ? new Date(b.publishedAt).toISOString() : now,
    changefreq: 'monthly',
    priority: '0.8',
  }));

  // 3. Prompt Post URLs (Clean URL without /prompt/ prefix)
  const promptUrls: SitemapEntry[] = posts.map((p) => {
    const slug = getPromptSlug(p);
    const lastmod = p.updatedAt || p.publishedAt || p.createdAt || now;
    return {
      url: `${baseUrl}/${slug}`,
      lastmod: typeof lastmod === 'string' ? lastmod : new Date(lastmod).toISOString(),
      changefreq: 'weekly',
      priority: '0.9',
    };
  });

  // Combine only approved pages: homepage, policy pages, blog articles, and prompt URLs
  const allUrls: SitemapEntry[] = [...staticUrls, ...blogUrls, ...promptUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
