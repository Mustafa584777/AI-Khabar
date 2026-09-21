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

export function getPromptMetaDescription(post?: { title?: string; prompt?: string; category?: string } | null): string {
  if (!post) return 'Discover and copy trending AI image prompts, photorealistic portraits, and creative art styles on PromptCMS.';
  const title = post.title ? post.title.trim() : '';
  const promptText = post.prompt ? post.prompt.trim().replace(/\s+/g, ' ') : '';
  const category = post.category ? post.category.trim() : '';

  if (promptText) {
    const snippet = promptText.length > 150 ? `${promptText.slice(0, 147)}...` : promptText;
    return `${title ? `${title}: ` : ''}${snippet}`;
  }
  if (title) {
    return `${title} - Free AI photo prompt, tags, and creative styling guide${category ? ` in ${category}` : ''}.`;
  }
  return 'Discover and copy trending AI image prompts, photorealistic portraits, and creative art styles.';
}

export function detectPostAspectRatio(post: { imageWidth?: number; imageHeight?: number; aspectRatio?: string }): string {
  if (post.imageWidth && post.imageHeight && post.imageWidth > 0 && post.imageHeight > 0) {
    const ratio = post.imageHeight / post.imageWidth;
    if (ratio > 1.4) return '3/4';
    if (ratio < 0.8) return '16/9';
    return '1/1';
  }
  return '3/4';
}

export * from './tag-utils';

