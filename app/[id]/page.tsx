import type { Metadata } from 'next';
import Image from 'next/image';
import { ServerStorage } from '@/lib/server-storage';
import { getPromptSlug } from '@/lib/utils';
import { DirectPromptLoader } from '@/components/public/DirectPromptLoader';

export const revalidate = 21600;

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

  if (!post) {
    return {
      title: 'Prompt Not Found | Trending Copy Paste Photo Prompts',
      description: 'The requested AI photo prompt was not found.',
    };
  }

  const slug = getPromptSlug(post);
  const cleanTitle = `${post.title} - AI Photo Prompt & Settings`;
  const cleanDesc =
    post.seoDescription?.trim() ||
    post.seo?.metaDescription?.trim() ||
    post.promptText?.slice(0, 160).trim() ||
    'Explore this curated copy-paste photo prompt for Midjourney, ChatGPT, Flux, and Gemini.';
  const pageUrl = `https://geminipromptgenerator.online/${slug}`;

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
      images: post.imageUrl
        ? [
            {
              url: post.imageUrl,
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
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
    robots: {
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

  const slug = post ? getPromptSlug(post) : id;
  const pageUrl = `https://geminipromptgenerator.online/${slug}`;

  // Structured Data Schema for Google (JSON-LD) - Strict NO AUTHOR
  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: post.title,
        headline: post.title,
        description: post.seoDescription || post.seo?.metaDescription || post.promptText,
        image: post.imageUrl,
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
            url: 'https://geminipromptgenerator.online/logo.png',
          },
        },
      }
    : null;

  const imageSchema = post?.imageUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        contentUrl: post.imageUrl,
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
          <p>{post.seoDescription || post.seo?.metaDescription || post.promptText}</p>
          <blockquote>{post.promptText}</blockquote>
          <div>Category: {post.category}</div>
          {post.tags && <div>Tags: {post.tags.join(', ')}</div>}
          {post.imageUrl && (
            <Image
              src={post.imageUrl}
              alt={post.imageAlt || post.title}
              width={post.imageWidth || 600}
              height={post.imageHeight || 800}
              referrerPolicy="no-referrer"
            />
          )}
        </article>
      )}
      <DirectPromptLoader id={id} initialPost={post} />
    </>
  );
}
