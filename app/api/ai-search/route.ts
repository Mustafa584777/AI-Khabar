import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ success: true, posts: [] });
    }

    const trimmedQuery = query.trim();

    // Record search query for admin analytics
    await ServerStorage.recordSearchQuery(trimmedQuery);

    const posts = await ServerStorage.getAllPosts(false); // published posts

    let matchedPostIds: string[] = [];
    let usedAi = false;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const postsSummary = posts.map(p => ({
            id: p.id,
            title: p.title,
            category: p.category,
            tags: p.tags,
            promptSnippet: p.promptText?.substring(0, 120),
          }));

          const prompt = "You are an AI semantic search and recommendation engine for an AI image prompt gallery.\n" +
            "User Search Query: \"" + trimmedQuery + "\"\n\n" +
            "Instructions:\n" +
            "1. Analyze the user's search query. It may contain spelling mistakes (e.g. \"Tradishnal sadi\" for \"traditional saree\"), slang, synonyms, abbreviations, or conceptual requests.\n" +
            "2. Match it against the provided list of image prompt posts.\n" +
            "3. Return a JSON object with a single key \"matchedIds\" containing an array of post IDs that are semantically relevant, ordered by best relevance first. Even if exact words aren't present, if the image topic, prompt, category, or tags relate to the intent, include them.\n" +
            "4. Return ONLY valid JSON: {\"matchedIds\": [\"id1\", \"id2\", ...]}\n\n" +
            "Available Posts:\n" + JSON.stringify(postsSummary);

          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            }
          });

          if (response && response.text) {
            const data = JSON.parse(response.text);
            if (data && Array.isArray(data.matchedIds)) {
              matchedPostIds = data.matchedIds;
              usedAi = true;
              break;
            }
          }
        } catch (err: any) {
          console.warn("[AI Search] Model " + model + " failed:", err?.message || err);
        }
      }
    }

    // Fallback / Synonym & Fuzzy Matcher if Gemini was unavailable or rate-limited
    if (!usedAi || matchedPostIds.length === 0) {
      const qLower = trimmedQuery.toLowerCase();
      const synonyms: Record<string, string[]> = {
        'sadi': ['saree', 'sari', 'traditional', 'indian', 'ethnic', 'wedding', 'bridal'],
        'saree': ['sadi', 'sari', 'traditional', 'indian', 'ethnic', 'wedding', 'bridal'],
        'sari': ['saree', 'sadi', 'traditional', 'indian', 'ethnic'],
        'tradishnal': ['traditional', 'classic', 'vintage', 'cultural', 'ethnic'],
        'traditional': ['classic', 'vintage', 'cultural', 'ethnic', 'saree', 'sadi'],
        'girl': ['woman', 'portrait', 'female', 'model', 'lady'],
        'boy': ['man', 'male', 'guy', 'portrait'],
        'car': ['vehicle', 'supercar', 'automotive', 'driving'],
        'cyber': ['cyberpunk', 'futuristic', 'neon', 'sci-fi'],
      };

      const searchTokens = qLower.split(/\s+/).filter(Boolean);
      const expandedTokens = new Set<string>(searchTokens);
      searchTokens.forEach(token => {
        if (synonyms[token]) {
          synonyms[token].forEach(syn => expandedTokens.add(syn));
        }
      });

      const scoredPosts = posts.map(post => {
        let score = 0;
        const titleL = (post.title || '').toLowerCase();
        const promptL = (post.promptText || '').toLowerCase();
        const catL = (post.category || '').toLowerCase();
        const tagsL = (post.tags || []).join(' ').toLowerCase();

        if (titleL.includes(qLower)) score += 50;
        if (catL.includes(qLower)) score += 30;
        if (tagsL.includes(qLower)) score += 30;
        if (promptL.includes(qLower)) score += 20;

        expandedTokens.forEach(token => {
          if (titleL.includes(token)) score += 15;
          if (catL.includes(token)) score += 10;
          if (tagsL.includes(token)) score += 10;
          if (promptL.includes(token)) score += 5;
        });

        return { post, score };
      });

      const sorted = scoredPosts.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
      matchedPostIds = sorted.map(item => item.post.id);

      if (matchedPostIds.length === 0) {
        matchedPostIds = posts.filter(p => 
          p.tags?.some(t => t.toLowerCase().includes(qLower)) ||
          p.category.toLowerCase().includes(qLower)
        ).map(p => p.id);
      }
    }

    const orderedPosts = matchedPostIds
      .map(id => posts.find(p => p.id === id))
      .filter(Boolean) as any[];

    const orderedIdsSet = new Set(matchedPostIds);
    const remainingPosts = posts.filter(p => !orderedIdsSet.has(p.id));
    const finalPosts = [...orderedPosts, ...remainingPosts];

    return NextResponse.json({
      success: true,
      usedAi,
      posts: finalPosts,
      matchedIds: matchedPostIds,
    });
  } catch (err: any) {
    console.error('AI search error:', err);
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 });
  }
}
