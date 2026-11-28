import { Category, PromptPost, SiteSettings } from '@/types/prompt';
import { hydrateCompactPosts } from './post-normalizer';

export const GITHUB_ASSETS_OWNER = 'Mustafa584777';
export const GITHUB_ASSETS_REPO = 'zeena-prompt-assets';
export const GITHUB_ASSETS_BRANCH = 'main';

export const PUBLIC_CDN_POSTS_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_ASSETS_OWNER}/${GITHUB_ASSETS_REPO}@${GITHUB_ASSETS_BRANCH}/data/posts.min.json`;
export const PUBLIC_RAW_POSTS_URL = `https://raw.githubusercontent.com/${GITHUB_ASSETS_OWNER}/${GITHUB_ASSETS_REPO}/${GITHUB_ASSETS_BRANCH}/data/posts.min.json`;

export const PUBLIC_CDN_META_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_ASSETS_OWNER}/${GITHUB_ASSETS_REPO}@${GITHUB_ASSETS_BRANCH}/data/site-meta.json`;
export const PUBLIC_RAW_META_URL = `https://raw.githubusercontent.com/${GITHUB_ASSETS_OWNER}/${GITHUB_ASSETS_REPO}/${GITHUB_ASSETS_BRANCH}/data/site-meta.json`;

export interface PublicSiteMetaSnapshot {
  categories?: Category[];
  tags?: string[];
  settings?: SiteSettings;
  searchQueries?: string[];
  updatedAt?: string;
  count?: number;
}

async function fetchJsonWithFallback<T>(urls: string[]): Promise<T | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: 'no-cache',
        mode: 'cors',
      });
      if (!res.ok) continue;
      const data = (await res.json()) as T;
      if (data) return data;
    } catch {
      // Try next CDN/raw endpoint
    }
  }
  return null;
}

export const FALLBACK_CDN_POSTS_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_ASSETS_OWNER}/AI-Khabar@main/data/posts.json`;
export const FALLBACK_RAW_POSTS_URL = `https://raw.githubusercontent.com/${GITHUB_ASSETS_OWNER}/AI-Khabar/main/data/posts.json`;

/**
 * Fetches the published prompt catalog directly from GitHub + jsDelivr CDN
 * (0 bytes of origin transfer and 0 KB bundled into server worker).
 */
export async function fetchPublicCatalogFromCdn(): Promise<PromptPost[] | null> {
  const data = await fetchJsonWithFallback<unknown[]>([
    PUBLIC_CDN_POSTS_URL,
    PUBLIC_RAW_POSTS_URL,
    FALLBACK_CDN_POSTS_URL,
    FALLBACK_RAW_POSTS_URL,
  ]);
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  return hydrateCompactPosts(data).filter((p) => p.status === 'published');
}

/**
 * Fetches categories, tags, site settings, and top search queries directly from jsDelivr CDN
 * (0 bytes of Vercel Fast Origin Transfer).
 */
export async function fetchPublicSiteMetaFromCdn(): Promise<PublicSiteMetaSnapshot | null> {
  const data = await fetchJsonWithFallback<PublicSiteMetaSnapshot>([
    PUBLIC_CDN_META_URL,
    PUBLIC_RAW_META_URL,
  ]);
  if (!data || typeof data !== 'object') {
    return null;
  }
  return data;
}
