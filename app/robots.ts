import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/cms-login', '/api/'],
    },
    sitemap: 'https://geminipromptgenerator.online/sitemap.xml',
  };
}
