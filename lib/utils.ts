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

