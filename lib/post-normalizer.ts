import { AITool, PromptPost } from '@/types/prompt';

const FALLBACK_ISO = '2026-01-01T00:00:00.000Z';

export function deriveIsoTimestampFromPost(raw: Partial<PromptPost> | null | undefined): string {
  if (!raw || typeof raw !== 'object') return FALLBACK_ISO;

  if (typeof raw.createdAt === 'string' && raw.createdAt.trim()) {
    return raw.createdAt;
  }
  if (typeof raw.publishedAt === 'string' && raw.publishedAt.trim()) {
    return raw.publishedAt;
  }

  if (typeof raw.id === 'string') {
    const match = raw.id.match(/^prompt-(\d{12,15})(?:-|$)/);
    if (match) {
      const ms = Number(match[1]);
      if (Number.isFinite(ms) && ms > 1577836800000 && ms < 4102444800000) {
        try {
          return new Date(ms).toISOString();
        } catch {}
      }
    }
  }

  if (typeof raw.updatedAt === 'string' && raw.updatedAt.trim()) {
    return raw.updatedAt;
  }

  return FALLBACK_ISO;
}

export function hydrateCompactPost(raw: any): PromptPost {
  const source = raw && typeof raw === 'object' ? raw : {};
  const derivedIso = deriveIsoTimestampFromPost(source);

  const status: PromptPost['status'] =
    source.status === 'trash' ||
    source.status === 'draft' ||
    source.status === 'scheduled' ||
    source.status === 'published'
      ? source.status
      : 'published';

  const aiTool: AITool = (source.aiTool || source.preferredAi || 'Midjourney') as AITool;
  const createdAt =
    typeof source.createdAt === 'string' && source.createdAt.trim()
      ? source.createdAt
      : derivedIso;
  const updatedAt =
    typeof source.updatedAt === 'string' && source.updatedAt.trim()
      ? source.updatedAt
      : typeof source.publishedAt === 'string' && source.publishedAt.trim()
        ? source.publishedAt
        : derivedIso;
  const publishedAt =
    status === 'published'
      ? typeof source.publishedAt === 'string' && source.publishedAt.trim()
        ? source.publishedAt
        : createdAt
      : source.publishedAt;

  return {
    ...source,
    status,
    aiTool,
    tags: Array.isArray(source.tags) ? source.tags : [],
    articleContent: typeof source.articleContent === 'string' ? source.articleContent : '',
    viewsCount: Number(source.viewsCount) || 0,
    copiesCount: Number(source.copiesCount) || 0,
    likesCount: Number(source.likesCount) || 0,
    bookmarksCount: Number(source.bookmarksCount) || 0,
    author:
      source.author && typeof source.author === 'object'
        ? source.author
        : {
            name: 'zeenaprompt.com',
            avatar: '/logo.png',
            role: 'Author',
          },
    seo:
      source.seo && typeof source.seo === 'object'
        ? source.seo
        : {
            metaTitle: typeof source.seoTitle === 'string' ? source.seoTitle : '',
            metaDescription: typeof source.seoDescription === 'string' ? source.seoDescription : '',
          },
    createdAt,
    updatedAt,
    publishedAt,
  } as PromptPost;
}

export function hydrateCompactPosts(rawList: unknown): PromptPost[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item) => hydrateCompactPost(item));
}

export function compactPostForJson(
  post: PromptPost,
  options?: { omitPublishedStatus?: boolean }
): Record<string, any> {
  const out: Record<string, any> = { ...post };

  delete out.copiesCount;
  delete out.author;
  delete out.aiTool;
  delete out.createdAt;
  delete out.articleContent;
  delete out.seo;
  delete out.viewsCount;
  delete out.likesCount;
  delete out.publishedAt;
  delete out.bookmarksCount;

  if (options?.omitPublishedStatus || !post.status || post.status === 'published') {
    delete out.status;
  }

  return out;
}

export function compactPostsForJson(
  posts: PromptPost[],
  options?: { omitPublishedStatus?: boolean }
): Array<Record<string, any>> {
  if (!Array.isArray(posts)) return [];
  return posts.map((post) => compactPostForJson(post, options));
}
