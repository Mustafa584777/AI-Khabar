import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import mediaRedirectsData from "@/data/media-redirects.json"

const mediaRedirects = (mediaRedirectsData || {}) as Record<string, string>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function getPromptSlug(post: { slug?: string; title?: string; id?: string }): string {
  if (post.title && post.title.trim()) {
    const slug = slugify(post.title);
    if (slug) return slug;
  }
  if (post.slug && post.slug.trim()) {
    const slug = slugify(post.slug);
    if (slug) return slug;
  }
  return post.id || 'prompt';
}

export function getPromptMetaDescription(post: {
  title?: string;
  category?: string;
  aiTool?: string;
  tags?: string[];
  seoDescription?: string;
  seo?: { metaDescription?: string };
  promptText?: string;
  parameters?: { aspectRatio?: string; lighting?: string; camera?: string; shotType?: string; style?: string };
}): string {
  if (post.seoDescription && post.seoDescription.trim().length > 15) {
    return post.seoDescription.trim();
  }
  if (post.seo?.metaDescription && post.seo.metaDescription.trim().length > 15) {
    return post.seo.metaDescription.trim();
  }
  const toolName = post.aiTool || 'Midjourney, ChatGPT, Gemini and Flux';
  const category = post.category || 'AI Photography';
  const title = post.title || 'Creative AI Photo Prompt';
  const tagsStr = post.tags && post.tags.length > 0 ? ` featuring ${post.tags.slice(0, 3).join(', ')}` : '';
  const lightingStr = post.parameters?.lighting ? ` with ${post.parameters.lighting}` : '';
  const cameraStr = post.parameters?.camera ? ` (${post.parameters.camera})` : '';
  const ratioStr = post.parameters?.aspectRatio ? ` [--ar ${post.parameters.aspectRatio}]` : '';
  
  return `Copy and paste this ${title} photo prompt for ${toolName}. Curated ${category.toLowerCase()} aesthetic${lightingStr}${cameraStr}${tagsStr}${ratioStr}. Instant 1-click copy.`;
}

export function getOptimizedImageUrl(url?: string, width = 550): string {
  if (!url || typeof url !== 'string') return url || '';
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanDirect = url.split('?')[0].trim();
  if (mediaRedirects[url]) {
    return mediaRedirects[url];
  }
  if (mediaRedirects[cleanDirect]) {
    return mediaRedirects[cleanDirect];
  }
  if (url.includes('res.cloudinary.com/idbpgaqz/image/upload/')) {
    const afterUpload = url.split('/image/upload/')[1] || '';
    const cleanAfter = afterUpload.split('?')[0].replace(/^\/+/, '');
    const segments = cleanAfter.split('/').filter(Boolean);
    if (
      segments.length > 0 &&
      (segments[0].includes(',') || /^(f|q|w|h|c|dpr|e|g|fl|ar)_/i.test(segments[0]))
    ) {
      segments.shift();
    }
    if (segments.length > 0 && /^v\d+$/i.test(segments[0])) {
      segments.shift();
    }
    if (segments.length > 0) {
      const assetPath = segments.join('/');
      if (mediaRedirects[assetPath]) {
        return mediaRedirects[assetPath];
      }
      return `https://cdn.jsdelivr.net/gh/Mustafa584777/zeena-prompt-assets@main/${assetPath}`;
    }
  }
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/q_auto') || url.includes('/image/upload/w_')) {
      return url.replace(/\/image\/upload\/[^/]+\//, `/image/upload/f_auto,q_auto:good,w_${width},c_limit/`);
    }
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:good,w_${width},c_limit/`);
  }
  return url;
}

export function getImageFallbackCandidates(url?: string, slug?: string): string[] {
  if (!url || typeof url !== 'string') return [];
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return [];
  }

  const candidates: string[] = [];
  const addCandidate = (candidate?: string | null) => {
    if (!candidate) return;
    if (candidate !== trimmed && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  // Match jsDelivr GitHub URL: https://cdn.jsdelivr.net/gh/<owner>/<repo>@<ref>/<path>
  const jsdMatch = trimmed.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/([^?#]+)(?:[?#].*)?$/i);
  if (jsdMatch) {
    const [, owner, repo, ref, assetPath] = jsdMatch;
    // 1. raw.githubusercontent.com at exact ref bypasses jsDelivr edge cache immediately
    addCandidate(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${assetPath}`);
    // 2. If ref wasn't main, also try @main on both raw and jsDelivr (handles moved/updated files)
    if (ref !== 'main') {
      addCandidate(`https://raw.githubusercontent.com/${owner}/${repo}/main/${assetPath}`);
      addCandidate(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/${assetPath}`);
    }
    // 3. If slug is known and URL pointed to a legacy prompt-<id>.* or mismatched filename/ext, try slug-based filenames
    if (slug) {
      const cleanSlug = slugify(slug);
      if (cleanSlug) {
        for (const ext of ['jpg', 'webp', 'png']) {
          const slugPath = `prompts/${cleanSlug}.${ext}`;
          if (slugPath !== assetPath) {
            addCandidate(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/${slugPath}`);
            addCandidate(`https://raw.githubusercontent.com/${owner}/${repo}/main/${slugPath}`);
          }
        }
      }
    }
  } else {
    // Match raw.githubusercontent.com fallback -> jsDelivr
    const rawMatch = trimmed.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/([^?#]+)(?:[?#].*)?$/i);
    if (rawMatch) {
      const [, owner, repo, ref, assetPath] = rawMatch;
      addCandidate(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${ref}/${assetPath}`);
    }
  }

  return candidates;
}

export function detectPostAspectRatio(post: {
  parameters?: { aspectRatio?: string };
  promptText?: string;
  imageWidth?: number;
  imageHeight?: number;
}): string {
  // 1. Actual measured/stored image dimensions take highest priority for true original aspect ratio
  if (post.imageWidth && post.imageHeight && post.imageWidth > 0 && post.imageHeight > 0) {
    return `${post.imageWidth} / ${post.imageHeight}`;
  }

  // 2. Direct parameter specification (e.g., "16:9", "9:16", "1:1", "3:4", "2:3")
  if (post.parameters?.aspectRatio) {
    const cleanParam = post.parameters.aspectRatio.trim().toLowerCase();
    if (cleanParam === 'square') return '1 / 1';
    const ratioParamMatch = cleanParam.match(/([0-9]+)\s*[:/x]\s*([0-9]+)/i);
    if (ratioParamMatch) {
      return `${ratioParamMatch[1]} / ${ratioParamMatch[2]}`;
    }
    const raw = cleanParam.replace(':', ' / ');
    if (raw.includes('/')) return raw;
  }

  const text = post.promptText || '';

  // 3. Midjourney / parameter flag like "--ar 16:9", "--ar 1:1", "--ar 9:16", "--ar 3:4", "--ar 2:3", "--ar 4:5"
  const arFlagMatch = text.match(/--ar\s+([0-9]+)\s*[:/]\s*([0-9]+)/i);
  if (arFlagMatch) {
    return `${arFlagMatch[1]} / ${arFlagMatch[2]}`;
  }

  // 4. Written aspect ratio like "Aspect ratio: 9:16 vertical" or "Aspect ratio: 16:9" or "Aspect ratio - 1:1"
  const arTextMatch = text.match(/aspect\s*ratio\s*[:=\-]?\s*([0-9]+)\s*[:/]\s*([0-9]+)/i);
  if (arTextMatch) {
    return `${arTextMatch[1]} / ${arTextMatch[2]}`;
  }

  // 5. Written square aspect ratio (e.g. "Aspect ratio: square", "square 1:1")
  if (/\baspect\s*ratio\s*[:=\-]?\s*square\b/i.test(text)) {
    return '1 / 1';
  }

  // 6. Standalone standard ratio mentions like "9:16", "16:9", "1:1", "3:4", "4:5", "2:3", "3:2"
  const patternMatch = text.match(/\b(16:9|9:16|1:1|3:4|4:3|4:5|5:4|2:3|3:2|21:9)\b/i);
  if (patternMatch) {
    return patternMatch[1].replace(':', ' / ');
  }

  // 7. Default pre-load placeholder fallback (overridden dynamically on image onLoad)
  return '3 / 4';
}

/**
 * Appends 'aspect ratio 3:4' by default to an AI generation prompt,
 * removing any redundant or previous aspect ratio flags.
 */
export function ensureAspectRatio34(text: string): string {
  let clean = (text || '').trim();
  // Strip existing aspect ratio flags if present
  clean = clean.replace(/--ar\s+[0-9]+:[0-9]+/gi, '').trim();
  clean = clean.replace(/(,\s*)?aspect\s*ratio\s*:?\s*[0-9]+:[0-9]+/gi, '').trim();
  // Remove any trailing commas, periods, colons or whitespace
  clean = clean.replace(/[,.:\s]+$/, '').trim();
  return clean ? `${clean}, aspect ratio 3:4` : 'aspect ratio 3:4';
}

export const FREE_USER_PROMPT_WATERMARK =
  'A small watermark reading zeenaprompt.com in bottom left corner in beautiful cursive calligraphy in white colour with transparent background';

export function formatPromptForClipboard(
  promptText: string,
  isPremiumMember: boolean
): string {
  const raw = promptText || '';
  const trimmed = raw.trim();
  if (!trimmed || isPremiumMember) return raw;
  if (trimmed.includes(FREE_USER_PROMPT_WATERMARK)) return raw;
  return `${trimmed}\n\n${FREE_USER_PROMPT_WATERMARK}`;
}

export function getEmailAvatarUrl(email?: string, name?: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  const seed = name && name !== 'Administrator' && name !== 'Admin' && name !== 'User' && name !== 'Creator'
    ? name
    : (cleanEmail.split('@')[0] || 'User');
  
  if (cleanEmail && cleanEmail.includes('@')) {
    // unavatar.io checks Google profile photo, Gravatar, and falls back to styled initials
    const fallback = encodeURIComponent(`https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=0284c7&color=ffffff&size=128&bold=true&length=2`);
    return `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=${fallback}`;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=0284c7&color=ffffff&size=128&bold=true&length=2`;
}

export * from './tag-utils';


