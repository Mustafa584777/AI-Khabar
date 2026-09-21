import { PromptPost } from '@/types/prompt';

export function semanticSearchPosts(query: string, posts: PromptPost[]): PromptPost[] {
  if (!query || !query.trim()) return posts;
  const q = query.toLowerCase().trim();
  const keywords = q.split(/\s+/);

  return posts.filter((post) => {
    const title = (post.title || '').toLowerCase();
    const promptText = (post.promptText || '').toLowerCase();
    const category = (post.category || '').toLowerCase();
    const tags = (post.tags || []).join(' ').toLowerCase();
    const aiTool = (post.aiTool || '').toLowerCase();

    return keywords.some(
      (kw) =>
        title.includes(kw) ||
        promptText.includes(kw) ||
        category.includes(kw) ||
        tags.includes(kw) ||
        aiTool.includes(kw)
    );
  });
}
