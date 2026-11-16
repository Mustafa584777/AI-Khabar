import { ServerStorage } from '@/lib/server-storage';
import { HomeClientWrapper } from '@/components/public/HomeClientWrapper';
import { getPromptSlug } from '@/lib/utils';

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
        initialCategories={categories}
        initialSettings={settings}
      />
    </>
  );
}
