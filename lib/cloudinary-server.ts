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

  if (!cloudName || !apiKey || !apiSecret) {
    const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    cloudName = cloudName || fromUrl.cloudName || '';
    apiKey = apiKey || fromUrl.apiKey || '';
    apiSecret = apiSecret || fromUrl.apiSecret || '';
  }

  if (settings) {
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

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function pingCloudinaryRest(creds: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}): Promise<any> {
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/ping`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${creds.apiKey}:${creds.apiSecret}`)}`,
      },
      cache: 'no-store',
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Cloudinary ping failed (${res.status})`);
  }
  return data;
}

/**
 * Uploads an image (base64 data URI or remote URL) to Cloudinary via standard REST fetch
 * (Zero Node SDK dependencies — works on Cloudflare Workers & Node.js)
 */
export async function uploadImageToCloudinary(
  image: string,
  options?: { folder?: string; publicId?: string }
): Promise<{ success: boolean; url: string; publicId?: string; width?: number; height?: number; error?: string }> {
  try {
    if (!image || typeof image !== 'string') {
      return { success: false, url: image, error: 'No image data provided' };
    }

    const { cloudName, apiKey, apiSecret, isConfigured } = await resolveCloudinaryCredentials();

    if (!isConfigured) {
      return { success: false, url: image, error: 'Cloudinary is not fully configured (missing Cloud Name, API Key, or API Secret)' };
    }

    let isLargeFile = true;
    if (image.startsWith('data:')) {
      try {
        const base64Data = image.split(',')[1] || '';
        const approxBytes = (base64Data.length * 3) / 4;
        if (approxBytes <= 500 * 1024) {
          isLargeFile = false;
        }
      } catch {}
    }

    const folder = options?.folder || 'prompts';
    const publicId = options?.publicId
      ? options.publicId.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 100)
      : undefined;
    const timestamp = Math.floor(Date.now() / 1000);

    const signParams: Record<string, string> = {
      folder,
      invalidate: 'true',
      overwrite: 'true',
      timestamp: String(timestamp),
    };
    if (isLargeFile) signParams.format = 'webp';
    if (publicId) signParams.public_id = publicId;

    const toSign = Object.keys(signParams)
      .sort()
      .map((k) => `${k}=${signParams[k]}`)
      .join('&');
    const signature = await sha1Hex(`${toSign}${apiSecret}`);

    const form = new FormData();
    form.append('file', image);
    form.append('api_key', apiKey);
    form.append('signature', signature);
    for (const [k, v] of Object.entries(signParams)) {
      form.append(k, v);
    }

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      {
        method: 'POST',
        body: form,
      }
    );

    const uploadResult = await uploadRes.json().catch(() => ({}));
    if (uploadRes.ok && uploadResult?.secure_url) {
      return {
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: typeof uploadResult.width === 'number' ? uploadResult.width : undefined,
        height: typeof uploadResult.height === 'number' ? uploadResult.height : undefined,
      };
    }

    return {
      success: false,
      url: image,
      error: uploadResult?.error?.message || 'Cloudinary upload did not return a secure URL',
    };
  } catch (err: any) {
    console.warn('Cloudinary upload error in helper:', err?.message || err);
    return { success: false, url: image, error: err?.message || 'Failed to upload to Cloudinary' };
  }
}
