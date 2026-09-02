import { MetadataRoute } from 'next';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://geminipromptgenerator.online';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    const posts = await ServerStorage.getAllPosts();
    // Only published posts are included; deleted and draft posts are excluded automatically
    const publishedPosts = (posts || []).filter(
      (p) => p && (p.status === 'published' || !p.status)
    );

    const postRoutes: MetadataRoute.Sitemap = publishedPosts.map((post) => {
      const slugOrId = post.slug || post.id;
      const lastModified = post.updatedAt
        ? new Date(post.updatedAt)
        : post.createdAt
        ? new Date(post.createdAt)
        : new Date();

      return {
        url: `${baseUrl}/post/${encodeURIComponent(slugOrId)}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      };
    });

    return [...staticRoutes, ...postRoutes];
  } catch (err) {
    console.error('Error generating dynamic sitemap:', err);
    return staticRoutes;
  }
}
