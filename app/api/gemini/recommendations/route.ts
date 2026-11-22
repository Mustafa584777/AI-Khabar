import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { runGeminiWithFastFallback } from '@/lib/gemini-runner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, profile, currentPost } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    // Action 1: Personalized Live Prompt Generation ("Inspire My Taste")
    if (action === 'personalized_prompt_craft') {
      const genderVibe = profile?.genderVibe || 'all';
      const styles = Array.isArray(profile?.favoriteStyles) ? profile.favoriteStyles.join(', ') : 'Photorealistic, Cinematic 8K';
      const tool = (Array.isArray(profile?.favoriteTools) && profile.favoriteTools[0]) || 'Midjourney';
      const topCategories = profile?.topCategories ? profile.topCategories.map((c: any) => c.name).join(', ') : 'Photorealistic & Portraits';

      const promptInstruction = `You are a world-class AI prompt engineer and creative director.
Create a brand new, breathtaking, studio-grade visual prompt tailored exclusively for this user's taste:
- Gender / Persona Vibe: ${genderVibe}
- Favorite Aesthetic Styles: ${styles}
- Preferred AI Engine: ${tool}
- Top Category Affinities: ${topCategories}

Return valid JSON with:
"title": Short compelling title (max 5 words)
"aiTool": "${tool}"
"category": Primary category name
"promptText": Fully composed, ready-to-run copy-paste prompt with optical lens, lighting, composition, and model parameters (e.g. --ar 16:9 --v 6.1)
"tags": Array of 4-6 relevant tag strings
"matchReason": One punchy sentence explaining why this matches their taste profile.`;

      const { parsedJson, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
        apiKey,
        expectJson: true,
        maxTotalMs: 12000,
        contents: promptInstruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              aiTool: { type: Type.STRING },
              category: { type: Type.STRING },
              promptText: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              matchReason: { type: Type.STRING },
            },
            required: ['title', 'aiTool', 'category', 'promptText', 'tags', 'matchReason'],
          },
        },
      });

      return NextResponse.json({ success: true, data: parsedJson, modelUsed, elapsedMs });
    }

    // Action 2: Contextual AI Prompt Insights ("Why You'll Love This Pin")
    if (action === 'contextual_pin_insight') {
      if (!currentPost) {
        return NextResponse.json({ error: 'currentPost is required' }, { status: 400 });
      }

      const genderVibe = profile?.genderVibe || 'all';
      const styles = Array.isArray(profile?.favoriteStyles) ? profile.favoriteStyles.join(', ') : 'Photorealistic';

      const { parsedJson, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
        apiKey,
        expectJson: true,
        maxTotalMs: 12000,
        contents: `Analyze this prompt pin:
Title: "${currentPost.title}"
Prompt: "${currentPost.promptText}"
Category: "${currentPost.category}"
AI Tool: "${currentPost.aiTool}"

User Taste Profile:
- Gender / Persona: ${genderVibe}
- Favorite Styles: ${styles}

Provide a concise JSON with:
1. "whyYouLikeIt": 1 engaging sentence explaining why this matches the user's taste.
2. "proTip": 1 actionable tip for generating the best image with this prompt.
3. "recommendedTags": Array of 3-4 aesthetic tags.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyYouLikeIt: { type: Type.STRING },
              proTip: { type: Type.STRING },
              recommendedTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['whyYouLikeIt', 'proTip', 'recommendedTags'],
          },
        },
      });

      return NextResponse.json({ success: true, data: parsedJson, modelUsed, elapsedMs });
    }

    // Action 4: Auto-Categorization & Tagging from Title, Prompt text & Image
    if (action === 'auto_categorize_and_tag') {
      const promptTitle = body.title || '';
      const promptContent = body.promptText || '';
      const availableCategories =
        Array.isArray(body.categories) && body.categories.length > 0
          ? body.categories.join(', ')
          : 'Photorealistic & Portraits, Anime & Manga, 3D Art & CGI, Sci-Fi & Cyberpunk, Landscapes & Nature, Architecture & Interiors, Fashion & Apparel, Logos & Graphic Design, Fantasy & Mythological, Photography & Vintage';

      const { parsedJson, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
        apiKey,
        expectJson: true,
        maxTotalMs: 12000,
        contents: `You are an expert AI Prompt Engineer and Taxonomy Specialist.
Analyze the following prompt content:
Title: "${promptTitle}"
Prompt Content: "${promptContent}"

Available Categories on platform: [${availableCategories}]

Task:
1. Select the single best matching category from the available list (or suggest a clean concise one).
2. Generate 5-7 distinct, high-volume relevant tags for search & discoverability.
3. Recommend the best suited AI Generator tool (e.g. Midjourney, ChatGPT / DALL-E, Flux, Stable Diffusion, Ideogram).
4. Provide a refined SEO meta description (max 150 chars).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              aiTool: { type: Type.STRING },
              metaDescription: { type: Type.STRING },
            },
            required: ['category', 'tags', 'aiTool', 'metaDescription'],
          },
        },
      });

      return NextResponse.json({ success: true, data: parsedJson, modelUsed, elapsedMs });
    }

    return NextResponse.json({ error: 'Unknown recommendation action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in recommendations API:', err);
    return NextResponse.json({ error: err?.message || 'Recommendation engine error' }, { status: 503 });
  }
}
