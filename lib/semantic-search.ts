import { PromptPost } from '@/types/prompt';

/**
 * Intelligent AI & multilingual semantic fuzzy search across prompts
 */
export function semanticSearchPosts(posts: PromptPost[], rawQuery: string): PromptPost[] {
  if (!rawQuery || !rawQuery.trim()) {
    return posts;
  }

  const query = rawQuery.trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const scored = posts
    .map((post) => {
      let score = 0;
      const titleLower = (post.title || '').toLowerCase();
      const promptLower = (post.promptText || '').toLowerCase();
      const categoryLower = (post.category || '').toLowerCase();
      const toolLower = (post.aiTool || '').toLowerCase();
      const tags = (post.tags || []).map((t) => t.toLowerCase());

      // Exact phrase match in title
      if (titleLower.includes(query)) {
        score += 50;
        if (titleLower.startsWith(query)) score += 20;
      }

      // Exact phrase match in prompt
      if (promptLower.includes(query)) {
        score += 30;
      }

      // Category match
      if (categoryLower.includes(query)) {
        score += 25;
      }

      // AI tool match
      if (toolLower.includes(query)) {
        score += 20;
      }

      // Exact tag match
      if (tags.some((t) => t === query)) {
        score += 35;
      } else if (tags.some((t) => t.includes(query))) {
        score += 20;
      }

      // Token-level matches
      let matchedTokens = 0;
      for (const token of queryTokens) {
        let tokenFound = false;
        if (titleLower.includes(token)) {
          score += 15;
          tokenFound = true;
        }
        if (promptLower.includes(token)) {
          score += 8;
          tokenFound = true;
        }
        if (tags.some((t) => t.includes(token))) {
          score += 10;
          tokenFound = true;
        }
        if (categoryLower.includes(token)) {
          score += 8;
          tokenFound = true;
        }
        if (toolLower.includes(token)) {
          score += 8;
          tokenFound = true;
        }
        if (tokenFound) matchedTokens++;
      }

      // Bonus if all query tokens matched
      if (queryTokens.length > 1 && matchedTokens === queryTokens.length) {
        score += 25;
      }

      return { post, score };
    })
    .filter((item) => item.score > 0);

  // Sort by highest relevance score first, then newest
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
  });

  return scored.map((item) => item.post);
}
