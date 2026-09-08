import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { PromptPost } from '@/types/prompt';

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

// Common typo & transliteration dictionary for local heuristic fallback
const LOCAL_SEMANTIC_EXPANSIONS: Record<string, string[]> = {
  sadi: ['saree', 'sari', 'bandhani', 'ethnic', 'indian', 'drape'],
  sari: ['saree', 'sadi', 'ethnic', 'indian'],
  tradishnal: ['traditional', 'ethnic', 'cultural', 'heritage'],
  deshi: ['desi', 'indian', 'south asian', 'traditional'],
  desi: ['indian', 'south asian', 'traditional', 'ethnic'],
  ciberpunk: ['cyberpunk', 'neon', 'futuristic', 'sci-fi'],
  saiberpunk: ['cyberpunk', 'neon', 'sci-fi'],
  sinematic: ['cinematic', 'film', 'dramatic', 'movie'],
  cinamatic: ['cinematic', 'film', 'dramatic'],
  fotu: ['photo', 'portrait', 'photography'],
  photu: ['photo', 'portrait', 'photography'],
  ghibily: ['ghibli', 'anime', 'miyazaki'],
  jibli: ['ghibli', 'anime'],
  asthetic: ['aesthetic', 'moody', 'style'],
  aisthetic: ['aesthetic', 'moody'],
  vintaj: ['vintage', 'retro', '35mm', 'classic'],
  anemi: ['anime', 'manga', 'japanese art'],
  portret: ['portrait', 'close-up', 'face'],
  lehenga: ['indian', 'ethnic', 'traditional', 'saree', 'bridal'],
  kurti: ['indian', 'ethnic', 'traditional', 'outfit'],
};

// Heuristic fallback matcher if Gemini API is unreachable or rate limited
function localSemanticMatch(query: string, posts: PromptPost[]) {
  const qClean = query.toLowerCase().trim();
  const words = qClean.split(/\s+/).filter(Boolean);

  let correctedWords: string[] = [];
  let expandedKeywords: string[] = [qClean, ...words];

  for (const w of words) {
    if (LOCAL_SEMANTIC_EXPANSIONS[w]) {
      const syns = LOCAL_SEMANTIC_EXPANSIONS[w];
      correctedWords.push(syns[0]);
      expandedKeywords.push(...syns);
    } else {
      correctedWords.push(w);
    }
  }

  const correctedQuery = correctedWords.join(' ');
  expandedKeywords = Array.from(new Set(expandedKeywords.map((k) => k.toLowerCase())));

  // Score each post against query words and expanded keywords
  const scoredPosts = posts.map((post) => {
    let score = 0;
    const title = (post.title || '').toLowerCase();
    const prompt = (post.promptText || '').toLowerCase();
    const cat = (post.category || '').toLowerCase();
    const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.toLowerCase()) : [];

    // Exact query match gets huge boost
    if (title.includes(qClean) || prompt.includes(qClean)) score += 50;

    // Check expanded keywords
    for (const kw of expandedKeywords) {
      if (title.includes(kw)) score += 15;
      if (tags.some((t) => t.includes(kw) || kw.includes(t))) score += 12;
      if (prompt.includes(kw)) score += 8;
      if (cat.includes(kw)) score += 6;
    }

    return { id: post.id, score };
  });

  const matched = scoredPosts
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((p) => p.id);

  return {
    correctedQuery: correctedQuery !== qClean ? correctedQuery : qClean,
    expandedKeywords: expandedKeywords.slice(0, 10),
    matchedPostIds: matched,
    explanation:
      correctedQuery !== qClean
        ? `Expanded search for "${qClean}" with terms like: ${expandedKeywords.slice(0, 5).join(', ')}`
        : `Matched keywords across catalog`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawQuery = body.query;

    if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters long',
      }, { status: 400 });
    }

    const query = rawQuery.trim();

    // 1. Record search query immediately on server (Requirement 2)
    void ServerStorage.recordSearchQuery(query).catch((e) => {
      console.warn('Background search query recording error:', e);
    });

    // 2. Fetch all published posts
    const allPosts = await ServerStorage.getAllPosts(false);
    const published = allPosts.filter((p) => p.status === 'published');

    if (published.length === 0) {
      return NextResponse.json({
        success: true,
        correctedQuery: query,
        expandedKeywords: [query],
        matchedPostIds: [],
        explanation: 'No published posts in catalog',
        isAiPowered: false,
      });
    }

    // 3. Prepare compact catalog index for Gemini
    const catalogSummary = published.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 8) : [],
      promptSnippet: (p.promptText || '').slice(0, 220),
    }));

    // 4. Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.info('[Semantic Search] No GEMINI_API_KEY provided. Using smart local semantic matcher.');
      const localResult = localSemanticMatch(query, published);
      return NextResponse.json({
        success: true,
        ...localResult,
        isAiPowered: false,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 5. System instructions & prompt for Gemini
    const systemInstruction = `You are an intelligent visual search and semantic matching engine for an AI image prompt gallery.
Your task is to understand user search queries, handle misspellings, typos, transliterated Hinglish/regional words (e.g. "Tradishnal sadi" means "traditional saree/sari/ethnic Indian attire"), and identify visual concepts, styles, subjects, and clothing.
Then evaluate the provided catalog of prompt posts and identify all relevant matching items. Even if the exact words are not in the title, match posts that represent the concept, attire, mood, or visual subject.`;

    const userPrompt = `User search query: "${query}"

Catalog of prompt posts:
${JSON.stringify(catalogSummary, null, 1)}

Please perform:
1. Identify intended meaning and correct any typos/phonetic spellings (e.g. "Tradishnal sadi" -> "traditional saree").
2. List 4-8 expanded synonyms, related aesthetic keywords, attire names, and visual descriptors.
3. Select and rank the post IDs from the catalog that match the user's intent, from most relevant to least relevant. Even if the title does not contain the exact query word, match posts whose prompts, attire, subject, tags, or theme visually relate to the user query (for example, saree, bandhani, Indian lookbook, ethnic wear for "Tradishnal sadi").
4. Return a JSON object strictly adhering to this structure:
{
  "correctedQuery": "corrected standard English search term or empty if already correct",
  "expandedKeywords": ["keyword1", "keyword2", "keyword3"],
  "matchedPostIds": ["id1", "id2"],
  "explanation": "Short friendly sentence explaining what was understood and matched"
}`;

    let lastError: any = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                correctedQuery: { type: Type.STRING },
                expandedKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                matchedPostIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                explanation: { type: Type.STRING },
              },
              required: ['correctedQuery', 'expandedKeywords', 'matchedPostIds', 'explanation'],
            },
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          const validPostIds = Array.isArray(parsed.matchedPostIds)
            ? parsed.matchedPostIds.filter((id: string) => published.some((p) => p.id === id))
            : [];

          // If AI found direct matches, return them!
          // Also merge with any exact local title/tag matches just in case
          const exactLower = query.toLowerCase();
          const localDirectMatches = published
            .filter((p) =>
              p.title.toLowerCase().includes(exactLower) ||
              (p.tags && p.tags.some((t) => t.toLowerCase().includes(exactLower)))
            )
            .map((p) => p.id);

          const finalIds = Array.from(new Set([...validPostIds, ...localDirectMatches]));

          return NextResponse.json({
            success: true,
            correctedQuery: parsed.correctedQuery || query,
            expandedKeywords: parsed.expandedKeywords || [query],
            matchedPostIds: finalIds,
            explanation: parsed.explanation || `Found ${finalIds.length} matching visual prompts.`,
            isAiPowered: true,
            modelUsed: model,
          });
        }
      } catch (err: any) {
        console.warn(`[Semantic Search] Model "${model}" failed:`, err?.message || err);
        lastError = err;
      }
    }

    // Fallback to smart local semantic matching if all models failed
    console.warn('[Semantic Search] All Gemini models failed or timed out. Falling back to local semantic matcher.');
    const fallback = localSemanticMatch(query, published);
    return NextResponse.json({
      success: true,
      ...fallback,
      isAiPowered: false,
      fallbackUsed: true,
      errorDetails: lastError?.message,
    });
  } catch (err: any) {
    console.error('Semantic search error:', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to process semantic search',
      details: err.message,
    }, { status: 500 });
  }
}
