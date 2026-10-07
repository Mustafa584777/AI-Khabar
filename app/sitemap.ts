import { MetadataRoute } from 'next';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://geminipromptgenerator.online';

  let posts: any[] = [];
  try {
    posts = await ServerStorage.getAllPosts(false);
  } catch (err) {
    console.error('Error loading posts for dynamic sitemap:', err);
  }

  // 1. Homepage & Essential Pages (Contact, Privacy Policy, Disclaimer)
  const corePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
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
  ];

  // 2. Dynamic Prompts (Strictly https://geminipromptgenerator.online/[slug] - NO 'prompt' word, NO images)
  const promptUrls: MetadataRoute.Sitemap = posts.map((post) => {
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

