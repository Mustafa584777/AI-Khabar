import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { SiteSettings } from '@/types/prompt';

function parseCloudinaryUrl(urlStr?: string): { cloudName?: string; apiKey?: string; apiSecret?: string } {
  if (!urlStr || !urlStr.startsWith('cloudinary://')) return {};
  try {
    const parsed = new URL(urlStr);
    return {
      apiKey: decodeURIComponent(parsed.username || ''),
      apiSecret: decodeURIComponent(parsed.password || ''),
      cloudName: parsed.hostname || '',
    };
  } catch {
    return {};
  }
}

async function resolveCloudinaryCredentials(): Promise<{
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  isConfigured: boolean;
}> {
  let settings: SiteSettings | null = null;
  try {
    settings = await ServerStorage.getSettings();
  } catch {
    // Non-blocking
  }

  // 1. Check environment variables
  let cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/^["']|["']$/g, '');
  let apiKey = (process.env.CLOUDINARY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  let apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim().replace(/^["']|["']$/g, '');

  // 2. Check CLOUDINARY_URL env
  if (!cloudName || !apiKey || !apiSecret) {
    const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL?.trim().replace(/^["']|["']$/g, ''));
    cloudName = cloudName || fromUrl.cloudName || '';
    apiKey = apiKey || fromUrl.apiKey || '';
    apiSecret = apiSecret || fromUrl.apiSecret || '';
  }

  // 3. Check Admin Site Settings from Database
  if ((!cloudName || !apiKey || !apiSecret) && settings) {
    cloudName = cloudName || (settings.cloudinaryCloudName || '').trim().replace(/^["']|["']$/g, '');
    apiKey = apiKey || (settings.cloudinaryApiKey || '').trim().replace(/^["']|["']$/g, '');
    apiSecret = apiSecret || (settings.cloudinaryApiSecret || '').trim().replace(/^["']|["']$/g, '');
  }

  const isConfigured = Boolean(cloudName && apiKey && apiSecret);
  return { cloudName, apiKey, apiSecret, isConfigured };
}

export async function GET() {
  try {
    const { cloudName, isConfigured } = await resolveCloudinaryCredentials();
    return NextResponse.json({
      configured: isConfigured,
      cloudName: isConfigured ? cloudName : null,
      provider: isConfigured ? 'cloudinary' : 'local_fallback',
    });
  } catch {
    return NextResponse.json({ configured: false, provider: 'local_fallback' });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, folder, publicId } = body || {};

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No valid image data provided' }, { status: 400 });
    }

    const { cloudName, apiKey, apiSecret, isConfigured } = await resolveCloudinaryCredentials();

    if (isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      try {
        const uploadResult = await cloudinary.uploader.upload(image, {
          folder: folder || 'prompts',
          resource_type: 'image',
          public_id: publicId || undefined,
          overwrite: true,
          invalidate: true,
        });

        if (uploadResult?.secure_url) {
          return NextResponse.json({
            url: uploadResult.secure_url,
            provider: 'cloudinary',
            public_id: uploadResult.public_id,
            format: uploadResult.format,
            width: uploadResult.width,
            height: uploadResult.height,
            success: true,
          });
        }
      } catch (cloudErr: any) {
        console.warn('Cloudinary upload API rejected/failed (falling back gracefully):', cloudErr?.message || cloudErr);
        // Fall back to local optimized data URL so admin creation NEVER breaks
        return NextResponse.json({
          url: image,
          provider: 'fallback',
          success: true,
          warning: cloudErr?.message || 'Cloudinary API upload error',
          message: 'Cloudinary upload error. Image saved locally for prompt publication.',
        });
      }
    }

    // If Cloudinary is not yet configured, return optimized image so creation never fails
    return NextResponse.json({
      url: image,
      provider: 'fallback',
      success: true,
      message: 'Cloudinary not configured. Image saved locally for prompt publication.',
    });
  } catch (error: any) {
    console.error('Upload route processing notice:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Upload processing failed' },
      { status: 500 }
    );
  }
}
