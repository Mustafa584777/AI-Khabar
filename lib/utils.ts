import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function getOptimizedImageUrl(url?: string, width = 550): string {
  if (!url || typeof url !== 'string') return url || '';
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/q_auto') || url.includes('/image/upload/w_')) {
      return url.replace(/\/image\/upload\/[^/]+\//, `/image/upload/f_auto,q_auto:good,w_${width},c_limit/`);
    }
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:good,w_${width},c_limit/`);
  }
  return url;
}

export function detectPostAspectRatio(post: {
  parameters?: { aspectRatio?: string };
  promptText?: string;
  imageWidth?: number;
  imageHeight?: number;
}): string {
  // 1. Direct parameter specification
  if (post.parameters?.aspectRatio) {
    const raw = post.parameters.aspectRatio.trim().replace(':', ' / ');
    if (raw.includes('/')) return raw;
  }

  const text = post.promptText || '';

  // 2. Midjourney / parameter flag like "--ar 16:9", "--ar 1:1", "--ar 9:16", "--ar 3:4"
  const arFlagMatch = text.match(/--ar\s+([0-9]+)\s*[:/]\s*([0-9]+)/i);
  if (arFlagMatch) {
    return `${arFlagMatch[1]} / ${arFlagMatch[2]}`;
  }

  // 3. Written aspect ratio like "Aspect ratio: 9:16 vertical" or "Aspect ratio: 1:1"
  const arTextMatch = text.match(/aspect\s*ratio\s*[:=\-]?\s*([0-9]+)\s*[:/]\s*([0-9]+)/i);
  if (arTextMatch) {
    return `${arTextMatch[1]} / ${arTextMatch[2]}`;
  }

  // 4. Standalone standard ratio mentions
  const patternMatch = text.match(/\b(16:9|9:16|1:1|3:4|4:3|4:5|5:4|2:3|3:2)\b/i);
  if (patternMatch) {
    return patternMatch[1].replace(':', ' / ');
  }

  // 5. Explicit imageWidth and imageHeight if non-default
  if (post.imageWidth && post.imageHeight && (post.imageWidth !== 1024 || post.imageHeight !== 1536)) {
    return `${post.imageWidth} / ${post.imageHeight}`;
  }

  // 6. Default fallback
  return '3 / 4';
}

export * from './tag-utils';

