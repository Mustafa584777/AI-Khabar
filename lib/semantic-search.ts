import { PromptPost } from '@/types/prompt';

/**
 * High-performance semantic and fuzzy scoring search for prompt catalog
 */
export function semanticSearchPosts(posts: PromptPost[], query: string): PromptPost[] {
  if (!query || !query.trim()) return posts;
  const cleanQuery = query.toLowerCase().trim();
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  const scored = posts.map((post) => {
    let score = 0;
    const titleLower = (post.title || '').toLowerCase();
    const promptLower = (post.promptText || '').toLowerCase();
    const categoryLower = (post.category || '').toLowerCase();
    const tagsLower = (post.tags || []).map((t) => t.toLowerCase());
    const toolLower = (post.aiTool || '').toLowerCase();

    // Exact phrase matches receive highest weight
    if (titleLower.includes(cleanQuery)) score += 60;
    if (categoryLower.includes(cleanQuery)) score += 45;
    if (tagsLower.some((t) => t.includes(cleanQuery))) score += 40;
    if (promptLower.includes(cleanQuery)) score += 30;

    // Token-level scoring
    for (const token of tokens) {
      if (titleLower.includes(token)) score += 12;
      if (categoryLower.includes(token)) score += 10;
      if (tagsLower.some((t) => t.includes(token))) score += 8;
      if (toolLower.includes(token)) score += 6;
      if (promptLower.includes(token)) score += 4;
    }

    return { post, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.post);
}
