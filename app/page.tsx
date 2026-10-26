import { ServerStorage } from '@/lib/server-storage';
import { HomeClientWrapper } from '@/components/public/HomeClientWrapper';
import { getPromptSlug } from '@/lib/utils';

export const revalidate = 60;

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
      {/* Semantic Crawl-Friendly HTML for Search Engine Crawlers (100% pure HTML, zero JS dependency) */}
      <div className="sr-only" aria-hidden="false">
        <h1>{settings?.heroHeadline || 'Trending Copy Paste AI Photo Prompts'}</h1>
        <p>{settings?.heroSubheadline || settings?.siteTagline || 'Discover and copy high-converting Midjourney, ChatGPT, Flux, and Stable Diffusion photo prompts.'}</p>
        
        <h2>Categories</h2>
        <ul>
          {categories.map((cat) => (
            <li key={cat.id}>
              <a href={`/?category=${cat.slug}`}>{cat.name}</a>
            </li>
          ))}
        </ul>

        <h2>Latest AI Photo Prompts</h2>
        <ul>
          {posts.map((post) => {
            const slug = getPromptSlug(post);
            return (
              <li key={post.id}>
                <article>
                  <h3>
                    <a href={`/${slug}`}>{post.title}</a>
                  </h3>
                  <p>{post.promptText}</p>
                  <div>Category: {post.category}</div>
                  <div>AI Tool: {post.aiTool}</div>
                  {post.tags && <div>Tags: {post.tags.join(', ')}</div>}
                </article>
              </li>
            );
          })}
        </ul>
      </div>

      <HomeClientWrapper
        initialPosts={posts}
        initialCategories={categories}
        initialSettings={settings}
      />
    </>
  );
}
