import type { Metadata } from 'next';
import ReactDOM from 'react-dom';
import { notFound } from 'next/navigation';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug, getPromptMetaDescription, getOptimizedImageUrl } from '@/lib/utils';
import { DirectPromptLoader } from '@/components/public/DirectPromptLoader';

export const revalidate = false;
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await ServerStorage.getAllPosts(false);
  const seen = new Set<string>();
  const paramsList: { id: string }[] = [];

  for (const post of posts) {
    if (!post) continue;
    const slug = getPromptSlug(post);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      paramsList.push({ id: slug });
    }
  }

  return paramsList;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function resolvePost(id: string) {
  let decodedId = id;
  try {
    decodedId = decodeURIComponent(id);
  } catch {}

  const post =
    (await ServerStorage.getPostBySlug(decodedId)) ||
    (await ServerStorage.getPostById(decodedId)) ||
    (await ServerStorage.getPostBySlug(id)) ||
    (await ServerStorage.getPostById(id));

  return post;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await resolvePost(id);

  if (!post || post.status !== 'published') {
    return {
      title: 'Prompt Not Found | Trending Copy Paste Photo Prompts',
      description: 'The requested AI photo prompt was not found.',
      robots: { index: false, follow: false },
    };
  }

  const slug = getPromptSlug(post);
  const cleanTitle = post.title;
  const cleanDesc = getPromptMetaDescription(post);
  const pageUrl = `https://zeenaprompt.com/${slug}`;
  const resolvedImageUrl = post.imageUrl ? getOptimizedImageUrl(post.imageUrl, 1200) : '';

  return {
    title: cleanTitle,
    description: cleanDesc,
    keywords: [
      post.title,
      post.category,
      ...(post.tags || []),
      'ai photo prompt',
      'copy paste prompt',
      'midjourney prompt',
      'chatgpt image prompt',
      'flux prompt',
      'gemini prompt',
    ],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: cleanTitle,
      description: cleanDesc,
      url: pageUrl,
      siteName: 'Trending Copy Paste Photo Prompts',
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt || post.publishedAt || post.createdAt,
      images: resolvedImageUrl
        ? [
            {
              url: resolvedImageUrl,
              width: post.imageWidth || 1200,
              height: post.imageHeight || 1600,
              alt: post.imageAlt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description: cleanDesc,
      images: resolvedImageUrl ? [resolvedImageUrl] : undefined,
    },
    robots: Boolean(
      post.isNoIndex ||
      (post as any).isNoIndex === 'true' ||
      post.parameters?.isNoIndex === true ||
      post.parameters?.isNoIndex === 'true' ||
      (post as any).seo?.noIndex ||
      (post as any).seo?.isNoIndex
    )
      ? {
          index: false,
          follow: false,
          'max-image-preview': 'large',
          'max-snippet': -1,
        }
      : {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
  };
}

export default async function SinglePromptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = await resolvePost(id);

  if (!post || post.status !== 'published') {
    notFound();
  }

  if (post.imageUrl) {
    ReactDOM.preload(getOptimizedImageUrl(post.imageUrl, 800), {
      as: 'image',
      fetchPriority: 'high',
    });
  }

  const slug = getPromptSlug(post);
  const pageUrl = `https://zeenaprompt.com/${slug}`;
  const resolvedImageUrl = post.imageUrl ? getOptimizedImageUrl(post.imageUrl, 1200) : '';

  // Structured Data Schema for Google (JSON-LD) - Strict NO AUTHOR
  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: post.title,
        headline: post.title,
        description: post.seoDescription || post.seo?.metaDescription || post.promptText,
        image: resolvedImageUrl || post.imageUrl,
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt || post.publishedAt || post.createdAt,
        genre: post.category,
        keywords: post.tags ? post.tags.join(', ') : undefined,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': pageUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Trending Copy Paste Photo Prompts',
          logo: {
            '@type': 'ImageObject',
            url: 'https://zeenaprompt.com/logo.png',
          },
        },
      }
    : null;

  const imageSchema = resolvedImageUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        contentUrl: resolvedImageUrl,
        name: post.title,
        description: post.imageAlt || post.title,
        caption: post.title,
        representativeOfPage: true,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {imageSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageSchema) }}
        />
      )}
      {/* Semantic Crawl-Friendly Content for Search Engines without Design Impact */}
      {post && (
        <article className="sr-only" aria-hidden="false">
          <h1>{post.title}</h1>
          <p>{getPromptMetaDescription(post)}</p>
          <blockquote>{post.promptText}</blockquote>
          <div>Category: {post.category}</div>
          {post.tags && <div>Tags: {post.tags.join(', ')}</div>}
        </article>
      )}
      <DirectPromptLoader id={id} initialPost={post} />
    </>
  );
}
