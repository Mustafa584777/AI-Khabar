import type { MetadataRoute } from 'next';

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://zeenaprompt.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/create',
          '/prompt-editor',
          '/prompt-editor/',
          '/about',
          '/contact',
          '/privacy-policy',
          '/disclaimer',
          '/terms',
          '/_next/static/',
          '/images/',
          '/*.png$',
          '/*.jpg$',
          '/*.jpeg$',
          '/*.webp$',
          '/*.svg$',
          '/*.ico$',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/cms-login',
          '/cms-login/',
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/checkout',
          '/checkout/',
          '/auth',
          '/auth/',
          '/pricing',
          '/pricing/',
          '/cancellation-refund',
          '/cancellation-refund/',
          '/ai-policy',
          '/ai-policy/',
          '/notifications',
          '/notifications/',
          '/blog',
          '/blog/',
          '/blog/how-to-use-photo-prompts',
          '/blog/best-camera-settings-for-ai-photography',
          '/blog/top-10-ai-prompting-mistakes-to-avoid',
          '/blog/flux-vs-midjourney-prompting-guide',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
