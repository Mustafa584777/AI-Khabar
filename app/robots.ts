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
          '/prompt-editor',
          '/prompt-editor/',
          '/blog',
          '/blog/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
