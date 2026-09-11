import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { NotificationServerStore } from '@/lib/notification-storage';

// In-memory buffer cache to serve collages near instantly
const collageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Helper to fetch an image with timeout
async function fetchImageBuffer(url: string, timeoutMs = 5000): Promise<Buffer | null> {
  try {
    if (!url || !url.startsWith('http')) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AuraPromptCollageBot/1.0)',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`[Collage] Failed to fetch image ${url}:`, err);
    return null;
  }
}

// Generate rounded rectangle SVG mask for sharp
function createRoundedMask(width: number, height: number, radius: number): Buffer {
  const svg = `<svg width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/>
  </svg>`;
  return Buffer.from(svg);
}

// Generate 16:9 fallback banner if image loading fails
async function createFallback16x9Banner(title = 'tool.reelz: Trending Photo Prompts'): Promise<Buffer> {
  const width = 1280;
  const height = 720;
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18181b" />
        <stop offset="50%" stop-color="#09090b" />
        <stop offset="100%" stop-color="#1c1917" />
      </linearGradient>
      <linearGradient id="redAccent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E60023" />
        <stop offset="100%" stop-color="#ad081b" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <circle cx="120" cy="120" r="48" fill="url(#redAccent)" opacity="0.9" />
    <text x="120" y="132" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">P</text>
    <text x="190" y="130" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="#ffffff">tool.reelz</text>
    <text x="190" y="156" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#a1a1aa">Trending AI Photo Prompts</text>
    <text x="120" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#ffffff">${title.slice(0, 48)}</text>
    <rect x="120" y="470" width="220" height="52" rx="26" fill="url(#redAccent)" />
    <text x="230" y="503" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">Explore Prompts</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const notifId = searchParams.get('id');
    const rawUrls = searchParams.get('urls');

    // Cache key
    const cacheKey = notifId || rawUrls || 'default';
    const cached = collageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new NextResponse(cached.buffer as any, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    let imagesToProcess: string[] = [];
    let notifTitle = 'tool.reelz: Trending Photo Prompts';

    if (notifId) {
      const all = NotificationServerStore.getNotifications();
      const target = all.find((n) => n.id === notifId);
      if (target) {
        notifTitle = target.title || notifTitle;
        if (Array.isArray(target.collageImages) && target.collageImages.length > 0) {
          imagesToProcess = target.collageImages.filter((u) => u && typeof u === 'string' && u.startsWith('http'));
        }
        if (imagesToProcess.length === 0 && target.imageUrl && target.imageUrl.startsWith('http')) {
          imagesToProcess = [target.imageUrl];
        }
      }
    }

    if (imagesToProcess.length === 0 && rawUrls) {
      imagesToProcess = rawUrls
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u.startsWith('http'));
    }

    // Default fallback if no images provided
    if (imagesToProcess.length === 0) {
      const fallbackBuf = await createFallback16x9Banner(notifTitle);
      return new NextResponse(fallbackBuf as any, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Total Canvas Dimensions: 1280 x 720 (Standard 16:9 Aspect Ratio)
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    const PADDING_Y = 24;
    const PADDING_X = 24;
    const CARD_HEIGHT = CANVAS_HEIGHT - PADDING_Y * 2; // 672px
    const USABLE_WIDTH = CANVAS_WIDTH - PADDING_X * 2; // 1232px
    const CORNER_RADIUS = 20;

    // Fetch images in parallel
    const fetchedBuffers = await Promise.all(
      imagesToProcess.slice(0, 4).map((url) => fetchImageBuffer(url))
    );
    const validBuffers = fetchedBuffers.filter((b): b is Buffer => b !== null);

    if (validBuffers.length === 0) {
      const fallbackBuf = await createFallback16x9Banner(notifTitle);
      return new NextResponse(fallbackBuf as any, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    let finalBuffer: Buffer;

    // CASE 1: Single Image -> Full 16:9 Aspect Ratio Banner
    if (validBuffers.length === 1) {
      finalBuffer = await sharp(validBuffers[0])
        .resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer();
    } else {
      // CASE 2: Multi-card Pinterest Strip (2, 3, or 4 images)
      const count = Math.min(validBuffers.length, 4);
      const GAP = count === 4 ? 16 : count === 3 ? 18 : 20;
      const totalGapsWidth = GAP * (count - 1);
      const CARD_WIDTH = Math.floor((USABLE_WIDTH - totalGapsWidth) / count);

      const mask = createRoundedMask(CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);

      const compositeItems: sharp.OverlayOptions[] = [];

      for (let i = 0; i < count; i++) {
        const left = PADDING_X + i * (CARD_WIDTH + GAP);
        const top = PADDING_Y;

        try {
          const cardBuf = await sharp(validBuffers[i])
            .resize(CARD_WIDTH, CARD_HEIGHT, {
              fit: 'cover',
              position: 'center',
            })
            .composite([
              {
                input: mask,
                blend: 'dest-in',
              },
            ])
            .png()
            .toBuffer();

          compositeItems.push({
            input: cardBuf,
            left,
            top,
          });
        } catch (cardErr) {
          console.warn(`[Collage] Error processing card ${i}:`, cardErr);
        }
      }

      // Base canvas: Dark refined neutral background with subtle noise/gradient
      const baseCanvas = sharp({
        create: {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          channels: 4,
          background: { r: 18, g: 18, b: 20, alpha: 1 },
        },
      });

      finalBuffer = await baseCanvas
        .composite(compositeItems)
        .png({ quality: 90 })
        .toBuffer();
    }

    // Cache the composite
    collageCache.set(cacheKey, {
      buffer: finalBuffer,
      contentType: 'image/png',
      timestamp: Date.now(),
    });

    return new NextResponse(finalBuffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: any) {
    console.error('[Collage API] Error generating collage:', error);
    const fallbackBuf = await createFallback16x9Banner();
    return new NextResponse(fallbackBuf as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  }
}
