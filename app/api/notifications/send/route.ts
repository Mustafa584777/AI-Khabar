import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { NotificationServerStore } from '@/lib/notification-storage';
import { PushNotificationItem } from '@/types/notification';

async function fetchBuffer(url: string, timeoutMs = 6000): Promise<Buffer | null> {
  try {
    if (!url) return null;
    if (url.startsWith('data:image/')) {
      const match = url.match(/^data:image\/[a-zA-Z0-9-+]+;base64,(.+)$/);
      if (match && match[1]) {
        return Buffer.from(match[1], 'base64');
      }
      return null;
    }
    if (url.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', url);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      return null;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
    return null;
  } catch {
    return null;
  }
}

async function generateServer16x9Collage(images: string[]): Promise<Buffer | null> {
  try {
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    const PADDING_X = 24;
    const PADDING_Y = 24;
    const CARD_HEIGHT = CANVAS_HEIGHT - PADDING_Y * 2;
    const USABLE_WIDTH = CANVAS_WIDTH - PADDING_X * 2;
    const CORNER_RADIUS = 20;

    const buffers = (await Promise.all(images.slice(0, 4).map((u) => fetchBuffer(u)))).filter(
      (b): b is Buffer => b !== null
    );

    if (buffers.length === 0) return null;

    if (buffers.length === 1) {
      // Full 16:9 widescreen single photo
      return await sharp(buffers[0])
        .resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    // 2, 3, or 4 images Pinterest-style strip
    const count = Math.min(buffers.length, 4);
    const GAP = count === 4 ? 16 : count === 3 ? 18 : 20;
    const totalGapsWidth = GAP * (count - 1);
    const CARD_WIDTH = Math.floor((USABLE_WIDTH - totalGapsWidth) / count);

    const maskSvg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="#fff"/>
    </svg>`;
    const mask = Buffer.from(maskSvg);

    const compositeItems: Array<{ input: Buffer; left: number; top: number }> = [];
    for (let i = 0; i < count; i++) {
      const left = PADDING_X + i * (CARD_WIDTH + GAP);
      const top = PADDING_Y;
      try {
        const cardBuf = await sharp(buffers[i])
          .resize(CARD_WIDTH, CARD_HEIGHT, {
            fit: 'cover',
            position: 'center',
          })
          .composite([{ input: mask, blend: 'dest-in' }])
          .png()
          .toBuffer();
        compositeItems.push({ input: cardBuf, left, top });
      } catch (e) {
        console.warn('Card composite error:', e);
      }
    }

    const baseCanvas = sharp({
      create: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 4,
        background: { r: 18, g: 18, b: 20, alpha: 1 },
      },
    });

    return await baseCanvas.composite(compositeItems).jpeg({ quality: 90 }).toBuffer();
  } catch (err) {
    console.warn('generateServer16x9Collage error:', err);
    return null;
  }
}

export async function GET() {
  try {
    const notifications = NotificationServerStore.getNotifications();
    const stats = NotificationServerStore.getStats();
    return NextResponse.json({
      success: true,
      notifications,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      body: contentBody,
      subtitle,
      category,
      imageUrl,
      collageImages,
      url,
      actionButtons,
      sendBrowserPush,
    } = body;

    if (!title || (!contentBody && !subtitle)) {
      return NextResponse.json(
        { error: 'Title and content body are required' },
        { status: 400 }
      );
    }

    const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const validCollage = Array.isArray(collageImages)
      ? collageImages.filter((u: string) => typeof u === 'string' && u.trim().length > 0).slice(0, 4)
      : [];

    const primaryImg = (imageUrl || validCollage[0] || '').trim();
    let effectiveImageUrl = '';

    // If imageUrl is ALREADY a pre-saved collage (e.g. /collages/collage-....jpg), use it directly!
    if (primaryImg && primaryImg.startsWith('/collages/')) {
      effectiveImageUrl = primaryImg;
    } else {
      const imagesToCompose = validCollage.length > 0 ? validCollage : (primaryImg ? [primaryImg] : []);
      if (imagesToCompose.length > 0) {
        try {
          const collageBuffer = await generateServer16x9Collage(imagesToCompose);
          if (collageBuffer) {
            const collagesDir = path.join(process.cwd(), 'public', 'collages');
            if (!fs.existsSync(collagesDir)) {
              fs.mkdirSync(collagesDir, { recursive: true });
            }
            const filename = `collage-${notifId}.jpg`;
            fs.writeFileSync(path.join(collagesDir, filename), collageBuffer);
            effectiveImageUrl = `/collages/${filename}`;
          }
        } catch (genErr) {
          console.warn('[SendNotification] Failed to pre-generate 16:9 collage on server:', genErr);
        }

        if (!effectiveImageUrl) {
          effectiveImageUrl = `/api/notifications/collage?id=${notifId}`;
        }
      }
    }

    const newNotification: PushNotificationItem = {
      id: notifId,
      title: title.trim(),
      subtitle: subtitle?.trim() || 'Trending AI Photo Prompts',
      body: (contentBody || subtitle || '').trim(),
      category: category || 'all',
      imageUrl: effectiveImageUrl || primaryImg,
      collageImages: validCollage.length > 0 ? validCollage : primaryImg ? [primaryImg] : [],
      url: url || '/',
      actionButtons: Array.isArray(actionButtons) ? actionButtons : [],
      sentAt: new Date().toISOString(),
      sentBy: 'admin',
      clicksCount: 0,
      read: false,
    };

    const { totalSent } = NotificationServerStore.addNotification(newNotification);

    return NextResponse.json({
      success: true,
      notification: newNotification,
      totalSent,
      message: 'Push notification queued and broadcasted successfully!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
