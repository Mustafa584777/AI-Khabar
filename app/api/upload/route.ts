import { NextResponse } from 'next/server';
import { resolveCloudinaryCredentials, uploadImageToCloudinary } from '@/lib/cloudinary-server';
import {
  resolveGitHubAssetsConfig,
  testGitHubAssetsConnection,
  uploadImageToGitHubAssets,
} from '@/lib/github-assets-server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isTest = searchParams.get('test') === 'true';
    const providerParam = searchParams.get('provider');

    const ghConfig = resolveGitHubAssetsConfig();
    const clConfig = await resolveCloudinaryCredentials();

    if (isTest) {
      if (providerParam !== 'cloudinary' && ghConfig.isConfigured) {
        const ghTest = await testGitHubAssetsConnection();
        return NextResponse.json({
          configured: ghTest.configured,
          success: ghTest.success,
          provider: 'github_cdn',
          owner: ghTest.owner,
          repo: ghTest.repo,
          branch: ghTest.branch,
          cdnBaseUrl: ghTest.cdnBaseUrl,
          message: ghTest.success
            ? `Connected to GitHub Assets (${ghTest.owner}/${ghTest.repo}@${ghTest.branch}) via jsDelivr CDN!`
            : undefined,
          error: ghTest.error,
        });
      }

      if (!clConfig.isConfigured) {
        return NextResponse.json({
          configured: false,
          success: false,
          provider: 'none',
          error:
            'No cloud media storage configured. Set GITHUB_ASSETS_TOKEN (recommended) or Cloudinary credentials.',
        });
      }

      cloudinary.config({
        cloud_name: clConfig.cloudName,
        api_key: clConfig.apiKey,
        api_secret: clConfig.apiSecret,
        secure: true,
      });

      try {
        const pingResult = await cloudinary.api.ping();
        return NextResponse.json({
          configured: true,
          success: true,
          provider: 'cloudinary',
          cloudName: clConfig.cloudName,
          pingResult,
          message: `Successfully connected to Cloudinary account (${clConfig.cloudName})!`,
        });
      } catch (pingErr: any) {
        return NextResponse.json({
          configured: true,
          success: false,
          provider: 'cloudinary',
          cloudName: clConfig.cloudName,
          error: pingErr?.message || 'Failed to ping Cloudinary API. Please check your credentials.',
        });
      }
    }

    if (ghConfig.isConfigured) {
      return NextResponse.json({
        configured: true,
        provider: 'github_cdn',
        owner: ghConfig.owner,
        repo: ghConfig.repo,
        branch: ghConfig.branch,
        cdnBaseUrl: ghConfig.cdnBaseUrl,
        cloudName: `${ghConfig.owner}/${ghConfig.repo}`,
      });
    }

    return NextResponse.json({
      configured: clConfig.isConfigured,
      cloudName: clConfig.isConfigured ? clConfig.cloudName : null,
      provider: clConfig.isConfigured ? 'cloudinary' : 'local_fallback',
    });
  } catch (error: any) {
    return NextResponse.json({ configured: false, error: error?.message || 'Error checking media storage status' });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, folder, publicId, exactPath } = body || {};

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No valid image data provided' }, { status: 400 });
    }

    // 1. Primary: GitHub Assets Repo + jsDelivr CDN
    const ghConfig = resolveGitHubAssetsConfig();
    let ghError: string | undefined;
    if (ghConfig.isConfigured) {
      const ghRes = await uploadImageToGitHubAssets(image, { folder, publicId, exactPath });
      if (ghRes.success && ghRes.url) {
        return NextResponse.json({
          url: ghRes.url,
          provider: 'github_cdn',
          path: ghRes.path,
          success: true,
        });
      }
      ghError = ghRes.error || 'GitHub Assets upload failed';
    }

    // 2. Fallback: Cloudinary (only if GitHub not configured or failed)
    const uploadRes = await uploadImageToCloudinary(image, { folder, publicId });
    if (uploadRes.success && uploadRes.url) {
      return NextResponse.json({
        url: uploadRes.url,
        provider: 'cloudinary',
        public_id: uploadRes.publicId,
        success: true,
      });
    }

    // If GitHub was configured and failed, do NOT fake success with raw base64 fallback
    if (ghConfig.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          provider: 'github_cdn',
          error: ghError || 'Failed to upload image to GitHub Assets',
        },
        { status: 502 }
      );
    }

    // 3. Local fallback only when no cloud provider is configured
    return NextResponse.json({
      url: image,
      provider: 'fallback',
      success: true,
      warning: uploadRes.error,
      message: uploadRes.error || 'Media cloud upload fallback used.',
    });
  } catch (error: any) {
    console.error('Upload route processing error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Upload processing failed' },
      { status: 500 }
    );
  }
}
