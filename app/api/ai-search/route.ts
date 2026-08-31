import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { semanticSearchPosts, expandSearchQuery } from '@/lib/semantic-search';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ success: true, posts: [], matchedIds: [] });
    }

    const trimmedQuery = query.trim();

    // Record search query for admin analytics
    await ServerStorage.recordSearchQuery(trimmedQuery);

    const posts = await ServerStorage.getAllPosts(false); // published posts

    let matchedPostIds: string[] = [];
    let usedAi = false;
    let expandedKeywords: string[] = [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const postsSummary = posts.map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            tags: p.tags,
            promptSnippet: p.promptText?.substring(0, 160),
            requestedDesc: p.requestedPromptDescription?.substring(0, 100),
          }));

          const prompt =
            `You are an expert AI semantic search engine for an AI image prompt gallery.\n` +
            `User Search Query: "${trimmedQuery}"\n\n` +
            `Analyze the search query carefully:\n` +
            `- It may contain Hinglish or Hindi transliterations (e.g., "Tradishnal sadi" means Traditional Saree/Indian ethnic dress, "ladki" means girl/woman, "gadi" means car/vehicle, "pahar" means mountain).\n` +
            `- It may contain spelling errors, phonetic typos, or mood/aesthetic requests.\n` +
            `- Find the posts that best visually, stylistically, or thematically match the user's intent.\n\n` +
            `Return a JSON object:\n` +
            `{\n` +
            `  "matchedIds": ["post-id-1", "post-id-2"],\n` +
            `  "expandedKeywords": ["traditional", "saree", "indian", "ethnic", "fashion"]\n` +
            `}\n\n` +
            `Available Posts:\n` +
            JSON.stringify(postsSummary);

          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response && response.text) {
            const data = JSON.parse(response.text);
            if (data && Array.isArray(data.matchedIds) && data.matchedIds.length > 0) {
              matchedPostIds = data.matchedIds;
              expandedKeywords = data.expandedKeywords || [];
              usedAi = true;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[AI Search] Model ${model} failed:`, err?.message || err);
        }
      }
    }

    // Fallback: Use our fast semantic multilingual search engine
    if (!usedAi || matchedPostIds.length === 0) {
      const semanticResults = semanticSearchPosts(posts, trimmedQuery);
      matchedPostIds = semanticResults.map((p) => p.id);
      expandedKeywords = expandSearchQuery(trimmedQuery);
    }

    const orderedPosts = matchedPostIds
      .map((id) => posts.find((p) => p.id === id))
      .filter(Boolean) as any[];

    return NextResponse.json({
      success: true,
      usedAi,
      posts: orderedPosts,
      matchedIds: matchedPostIds,
      expandedKeywords,
    });
  } catch (err: any) {
    console.error('AI search error:', err);
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 });
  }
}

