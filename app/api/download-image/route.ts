import { NextRequest, NextResponse } from 'next/server';
import { getOptimizedImageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const ALLOWED_EXACT_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'raw.githubusercontent.com',
  'res.cloudinary.com',
  'images.unsplash.com',
  'plus.unsplash.com',
  'picsum.photos',
  'image.pollinations.ai',
  'pollinations.ai',
  'lh3.googleusercontent.com',
  'firebasestorage.googleapis.com',
]);

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_EXACT_HOSTS.has(host)) return true;
  if (host.endsWith('.cloudinary.com')) return true;
  if (host.endsWith('.googleusercontent.com')) return true;
  return false;
}

function extensionFromContentType(contentType: string, pathname: string): string {
  const ct = contentType.toLowerCase().split(';')[0].trim();
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  if (ct === 'image/avif') return 'avif';
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';

  const pathMatch = pathname.toLowerCase().match(/\.(png|webp|gif|avif|jpe?g)(?:$|\?)/);
  if (pathMatch) {
    return pathMatch[1] === 'jpeg' ? 'jpg' : pathMatch[1];
  }
  return 'jpg';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = (searchParams.get('url') || '').trim();
    const rawFilename = (searchParams.get('filename') || 'zeenaprompt-photo').trim();

    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const resolvedUrl = getOptimizedImageUrl(rawUrl, 1200);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(resolvedUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS image URLs are supported' }, { status: 400 });
    }

    if (!isAllowedImageHost(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Host not permitted for download proxy' }, { status: 403 });
    }

    const upstream = await fetch(parsedUrl.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Failed to fetch upstream image (${upstream.status})` },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/') && !contentType.toLowerCase().includes('octet-stream')) {
      return NextResponse.json({ error: 'Upstream resource is not an image' }, { status: 415 });
    }

    const ext = extensionFromContentType(contentType, parsedUrl.pathname);
    const safeBase = rawFilename
      .replace(/\.(png|webp|gif|avif|jpe?g)$/i, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'zeenaprompt-photo';
    const finalFilename = `${safeBase}.${ext}`;

    const headers = new Headers();
    headers.set('Content-Type', contentType.toLowerCase().startsWith('image/') ? contentType : `image/${ext === 'jpg' ? 'jpeg' : ext}`);
    headers.set('Content-Disposition', `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('X-Content-Type-Options', 'nosniff');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to download image' },
      { status: 500 }
    );
  }
}
