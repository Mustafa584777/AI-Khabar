import { MetadataRoute } from 'next';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await ServerStorage.getAllPosts(false);
  
  const postUrls = posts.map((post) => {
    const slug = getPromptSlug(post);
    return {
      url: `https://geminipromptgenerator.online/${slug}`,
      lastModified: new Date(post.createdAt || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  return [
    {
      url: 'https://geminipromptgenerator.online/',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://geminipromptgenerator.online/dashboard',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://geminipromptgenerator.online/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...postUrls,
  ];
}
