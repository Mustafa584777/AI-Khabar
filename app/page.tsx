import ReactDOM from 'react-dom';
import { ServerStorage } from '@/lib/server-storage';
import { HomeClientWrapper } from '@/components/public/HomeClientWrapper';
import { getPromptSlug, getOptimizedImageUrl } from '@/lib/utils';

export const revalidate = false;

export default async function Page() {
  const rawPosts = await ServerStorage.getAllPosts(false);
  const categories = await ServerStorage.getAllCategories();
  const settings = await ServerStorage.getSettings();

  // Strict deduplication to guarantee no prompt is ever rendered twice on homepage
  const seenSlugs = new Set<string>();
  const seenIds = new Set<string>();
  const posts: typeof rawPosts = [];

  for (const post of rawPosts) {
    if (!post || !post.id) continue;
    const slug = getPromptSlug(post);
    if (!seenIds.has(post.id) && !seenSlugs.has(slug)) {
      seenIds.add(post.id);
      seenSlugs.add(slug);
      posts.push({
        ...post,
        slug,
      });
    }
  }

  // Sort newest first deterministically to match PromptGrid default SSR order and preload top 2 hero cards
  const newestSorted = [...posts]
    .filter((p) => p.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0).getTime() -
        new Date(a.publishedAt || a.createdAt || 0).getTime()
    );

  for (let i = 0; i < Math.min(2, newestSorted.length); i++) {
    const img = newestSorted[i]?.imageUrl;
    if (img) {
      ReactDOM.preload(getOptimizedImageUrl(img, 360), {
        as: 'image',
        fetchPriority: 'high',
      });
    }
  }

  return (
    <>
      {/* Lightweight Semantic Crawl-Friendly Links for Search Engine Crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>{settings?.heroHeadline || 'Trending Copy Paste AI Photo Prompts'}</h1>
        <p>{settings?.heroSubheadline || settings?.siteTagline || 'Discover and copy high-converting Midjourney, ChatGPT, Flux, and Stable Diffusion photo prompts.'}</p>

        <h2>Categories</h2>
        <ul>
          {categories.map((cat) => (
            <li key={cat.id}>
              <strong>{cat.name}</strong>: {cat.description}
            </li>
          ))}
        </ul>

        <h2>Latest AI Photo Prompts</h2>
        <ul>
          {posts.map((post) => {
            const slug = getPromptSlug(post);
            return (
              <li key={post.id}>
                <a href={`/${slug}`}>{post.title}</a> — {post.category} ({post.aiTool})
              </li>
            );
          })}
        </ul>
      </div>

      <HomeClientWrapper
        initialPosts={newestSorted.slice(0, 16)}
        initialCategories={categories}
        initialSettings={settings}
      />
    </>
  );
}
