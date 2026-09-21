import { v2 as cloudinary } from 'cloudinary';
import { ServerStorage } from './server-storage';
import { SiteSettings } from '@/types/prompt';

export function parseCloudinaryUrl(urlStr?: string): { cloudName?: string; apiKey?: string; apiSecret?: string } {
  if (!urlStr) return {};
  const cleaned = urlStr.trim().replace(/^["']|["']$/g, '');
  if (!cleaned.startsWith('cloudinary://')) return {};
  try {
    const parsed = new URL(cleaned);
    return {
      apiKey: decodeURIComponent(parsed.username || ''),
      apiSecret: decodeURIComponent(parsed.password || ''),
      cloudName: parsed.hostname || '',
    };
  } catch {
    return {};
  }
}

export async function resolveCloudinaryCredentials(): Promise<{
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
  let cloudName = (
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  let apiKey = (
    process.env.CLOUDINARY_API_KEY ||
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  let apiSecret = (
    process.env.CLOUDINARY_API_SECRET ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  // 2. Check CLOUDINARY_URL env
  if (!cloudName || !apiKey || !apiSecret) {
    const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    cloudName = cloudName || fromUrl.cloudName || '';
    apiKey = apiKey || fromUrl.apiKey || '';
    apiSecret = apiSecret || fromUrl.apiSecret || '';
  }

  // 3. Check Admin Site Settings from Database
  if (settings) {
    // Check if user pasted full cloudinary:// string into the cloud name input
    const fromSettingsUrl = parseCloudinaryUrl(settings.cloudinaryCloudName);
    if (fromSettingsUrl.cloudName && fromSettingsUrl.apiKey && fromSettingsUrl.apiSecret) {
      cloudName = fromSettingsUrl.cloudName;
      apiKey = fromSettingsUrl.apiKey;
      apiSecret = fromSettingsUrl.apiSecret;
    } else {
      cloudName = cloudName || (settings.cloudinaryCloudName || '').trim().replace(/^["']|["']$/g, '');
      apiKey = apiKey || (settings.cloudinaryApiKey || '').trim().replace(/^["']|["']$/g, '');
      apiSecret = apiSecret || (settings.cloudinaryApiSecret || '').trim().replace(/^["']|["']$/g, '');
    }
  }

  const isConfigured = Boolean(cloudName && apiKey && apiSecret);
  return { cloudName, apiKey, apiSecret, isConfigured };
}

/**
 * Uploads an image (base64 data URI or remote URL) to Cloudinary
 */
export async function uploadImageToCloudinary(
  image: string,
  options?: { folder?: string; publicId?: string }
): Promise<{ success: boolean; url: string; publicId?: string; error?: string }> {
  try {
    if (!image || typeof image !== 'string') {
      return { success: false, url: image, error: 'No image data provided' };
    }

    const { cloudName, apiKey, apiSecret, isConfigured } = await resolveCloudinaryCredentials();

    if (!isConfigured) {
      return { success: false, url: image, error: 'Cloudinary is not fully configured (missing Cloud Name, API Key, or API Secret)' };
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: options?.folder || 'prompts',
      resource_type: 'image',
      format: 'webp',
      public_id: options?.publicId ? options.publicId.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 100) : undefined,
      overwrite: true,
      invalidate: true,
    });

    if (uploadResult && uploadResult.secure_url) {
      return {
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
    }

    return { success: false, url: image, error: 'Cloudinary upload did not return a secure URL' };
  } catch (err: any) {
    console.warn('Cloudinary upload error in helper:', err?.message || err);
    return { success: false, url: image, error: err?.message || 'Failed to upload to Cloudinary' };
  }
}
