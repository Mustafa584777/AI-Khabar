import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dataUrl, notificationId } = body;

    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Valid image dataUrl is required' }, { status: 400 });
    }

    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Invalid base64 image data format' }, { status: 400 });
    }

    const extension = matches[1] === 'jpeg' || matches[1] === 'jpg' ? 'jpg' : matches[1] === 'png' ? 'png' : 'webp';
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const collagesDir = path.join(process.cwd(), 'public', 'collages');
    if (!fs.existsSync(collagesDir)) {
      fs.mkdirSync(collagesDir, { recursive: true });
    }

    const safeId = notificationId
      ? notificationId.replace(/[^a-zA-Z0-9-_]/g, '')
      : `notif-${Date.now()}`;
    const filename = `collage-${safeId}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
    const filePath = path.join(collagesDir, filename);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/collages/${filename}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      filename,
    });
  } catch (error: any) {
    console.error('Failed to save collage image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save collage image' },
      { status: 500 }
    );
  }
}
