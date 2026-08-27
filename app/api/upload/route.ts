import { NextResponse } from 'next/server';
import { resolveCloudinaryCredentials, uploadImageToCloudinary } from '@/lib/cloudinary-server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isTest = searchParams.get('test') === 'true';

    const { cloudName, apiKey, apiSecret, isConfigured } = await resolveCloudinaryCredentials();

    if (isTest) {
      if (!isConfigured) {
        return NextResponse.json({
          configured: false,
          success: false,
          error: 'Cloudinary credentials missing. Please provide Cloud Name, API Key, and API Secret.',
        });
      }

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      try {
        const pingResult = await cloudinary.api.ping();
        return NextResponse.json({
          configured: true,
          success: true,
          cloudName,
          pingResult,
          message: `Successfully connected to Cloudinary account (${cloudName})!`,
        });
      } catch (pingErr: any) {
        return NextResponse.json({
          configured: true,
          success: false,
          cloudName,
          error: pingErr?.message || 'Failed to ping Cloudinary API. Please check your credentials.',
        });
      }
    }

    return NextResponse.json({
      configured: isConfigured,
      cloudName: isConfigured ? cloudName : null,
      provider: isConfigured ? 'cloudinary' : 'local_fallback',
    });
  } catch (error: any) {
    return NextResponse.json({ configured: false, error: error?.message || 'Error checking Cloudinary status' });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, folder, publicId } = body || {};

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No valid image data provided' }, { status: 400 });
    }

    const uploadRes = await uploadImageToCloudinary(image, { folder, publicId });

    if (uploadRes.success && uploadRes.url) {
      return NextResponse.json({
        url: uploadRes.url,
        provider: 'cloudinary',
        public_id: uploadRes.publicId,
        success: true,
      });
    }

    // If Cloudinary failed or isn't configured, fall back gracefully to the optimized local WebP
    return NextResponse.json({
      url: image,
      provider: 'fallback',
      success: true,
      warning: uploadRes.error,
      message: uploadRes.error || 'Cloudinary upload fallback used.',
    });
  } catch (error: any) {
    console.error('Upload route processing error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Upload processing failed' },
      { status: 500 }
    );
  }
}
