import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/cms-login/',
    },
    sitemap: 'https://geminipromptgenerator.online/sitemap.xml',
  };
}
