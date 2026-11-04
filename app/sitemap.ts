import { MetadataRoute } from 'next';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://zeenaprompt.com';

  let posts: any[] = [];
  try {
    // Load published posts directly from local posts.json (zero Firestore reads)
    posts = await ServerStorage.getAllPosts(false, false);
  } catch (err) {
    console.error('Error loading posts for sitemap:', err);
  }

  // 1. Homepage & Essential Pages (Create, About, Contact, Privacy Policy, Disclaimer, Terms)
  const corePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/create`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/prompt-editor`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // 2. Dynamic Prompts (Strictly https://zeenaprompt.com/[slug] - NO 'prompt' word, NO images)
  // Ensure that any prompt/article marked as noIndex in admin panel is automatically excluded from sitemap.xml
  const promptUrls: MetadataRoute.Sitemap = posts
    .filter((post) => {
      if (!post || !post.title) return false;
      if (post.status !== 'published') return false;
      const isNoIndex = Boolean(
        post.isNoIndex ||
        (post as any).isNoIndex === 'true' ||
        post.parameters?.isNoIndex === true ||
        post.parameters?.isNoIndex === 'true' ||
        (post as any).seo?.noIndex ||
        (post as any).seo?.isNoIndex
      );
      return !isNoIndex;
    })
    .map((post) => {
      const slug = getPromptSlug(post);
      return {
        url: `${baseUrl}/${slug}`,
        lastModified: new Date(post.updatedAt || post.publishedAt || post.createdAt || new Date()),
        changeFrequency: 'weekly',
        priority: 0.9,
      };
    });

  return [...corePages, ...promptUrls];
}

