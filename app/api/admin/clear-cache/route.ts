import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getClientIp, checkRateLimit, createRateLimitResponse } from '@/lib/security';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATIC_APP_ROUTES = [
  '/',
  '/create',
  '/prompt-editor',
  '/free-gemini-watermark-remover-online',
  '/removedor-de-marca-dagua-gemini-online',
  '/pricing',
  '/checkout',
  '/notifications',
  '/dashboard',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/disclaimer',
  '/cancellation-refund',
  '/ai-policy',
  '/auth',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.webmanifest',
  '/api/posts',
  '/api/posts/[id]',
  '/api/categories',
  '/api/tags',
  '/api/settings',
  '/api/notifications/latest',
];

export async function POST(req: NextRequest) {
  // Security: Rate limiting protection (35 req/min)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit('admin', clientIp);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetInMs);
  }

  try {
    const timestamp = new Date().toISOString();

    // 1. Purge all in-memory ServerStorage runtime caches so fresh JSON/files are read immediately
    ServerStorage.clearMemoryCache();

    // 2. Collect all static routes + dynamic prompt slug/id URLs
    const revalidatedSet = new Set<string>(STATIC_APP_ROUTES);

    try {
      const allPosts = await ServerStorage.getAllPosts(true);
      for (const post of allPosts) {
        if (!post) continue;
        const slug = getPromptSlug(post);
        if (slug) revalidatedSet.add(`/${slug}`);
        if (post.id) revalidatedSet.add(`/${post.id}`);
      }
    } catch (e) {
      console.warn('Could not enumerate dynamic prompt URLs during cache purge:', e);
    }

    // 3. Revalidate Next.js layout, dynamic [id] segment, and all individual URLs
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/', 'page');
      revalidatePath('/[id]', 'page');
      for (const routePath of revalidatedSet) {
        try {
          revalidatePath(routePath);
        } catch {}
      }
    } catch (e) {
      console.warn('Path revalidation notice:', e);
    }

    // 4. Optional Cloudflare Zone CDN Edge Purge if configured in environment
    let cloudflarePurged = false;
    const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cfZoneId && cfToken) {
      try {
        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ purge_everything: true }),
          }
        );
        cloudflarePurged = cfRes.ok;
      } catch (cfErr) {
        console.warn('Cloudflare purge notice:', cfErr);
      }
    }

    const revalidatedPaths = Array.from(revalidatedSet);

    return NextResponse.json(
      {
        success: true,
        message: cloudflarePurged
          ? `Purged all ${revalidatedPaths.length} URLs, server cache, Cloudflare CDN, and browser cache!`
          : `Purged all ${revalidatedPaths.length} URLs, server cache, and browser cache!`,
        timestamp,
        cacheBuster: Date.now(),
        revalidatedCount: revalidatedPaths.length,
        revalidatedPaths: revalidatedPaths.slice(0, 50),
        cloudflarePurged,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
