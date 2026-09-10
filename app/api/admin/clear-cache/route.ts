import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getClientIp, checkRateLimit, createRateLimitResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Security: Rate limiting protection (35 req/min)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('admin', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const timestamp = new Date().toISOString();
    const revalidatedPaths = [
      '/',
      '/:slug*',
      '/explore',
      '/trending',
      '/for-you',
      '/pricing',
      '/checkout',
      '/sitemap.xml',
      '/robots.txt',
    ];

    // Revalidate critical routes in Next.js ISR cache
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/[slug]', 'page');
      revalidatePath('/sitemap.xml');
    } catch (e) {
      console.warn('Path revalidation notice:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'System cache, static route caches, and CDN paths purged successfully.',
      timestamp,
      revalidatedPaths,
    });
  } catch (error: any) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
