import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

async function generateWithFallback(ai: GoogleGenAI, payload: any) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        ...payload,
        model,
      });
      if (res && res.text) {
        return { response: res, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Recommendations] Model "${model}" failed: ${err?.message || err}`);
      lastError = err;
    }
  }
  throw lastError || new Error('All candidate Gemini models were unavailable.');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, profile, currentPost, postsContext } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // Action 1: Personalized Live Prompt Generation ("Inspire My Taste")
    if (action === 'personalized_prompt_craft') {
      const genderVibe = profile?.genderVibe || 'all';
      const styles = Array.isArray(profile?.favoriteStyles) ? profile.favoriteStyles.join(', ') : 'Photorealistic, Cinematic 8K';
      const tool = (Array.isArray(profile?.favoriteTools) && profile.favoriteTools[0]) || 'Midjourney';
      const topCategories = profile?.topCategories ? profile.topCategories.map((c: any) => c.name).join(', ') : 'Photorealistic & Portraits';

      if (!apiKey) {
        // High quality deterministic fallback
        return NextResponse.json({
          success: true,
          data: {
            title: `Masterpiece ${genderVibe !== 'all' ? genderVibe.toUpperCase() : 'Cinematic'} Composition`,
            aiTool: tool,
            category: topCategories.split(',')[0] || 'Photorealistic & Portraits',
            promptText: `Ultra-high-definition editorial photograph of a ${genderVibe !== 'all' ? genderVibe : 'striking'} subject, captured with Sony A7R V 85mm f/1.4 GM lens, dramatic volumetric cinematic lighting, natural skin micro-textures, color graded in DaVinci Resolve, 8K resolution, photorealistic depth of field --ar 16:9 --v 6.1`,
            tags: ['Personalized AI', '8K Resolution', 'Cinematic Lighting', tool, 'Editorial Photo'],
            matchReason: `Custom engineered for your ${genderVibe} & ${styles} taste profile.`,
          },
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptInstruction = `You are a world-class AI prompt engineer and creative director.
Create a brand new, breathtaking, studio-grade visual prompt tailored exclusively for this user's taste:
- Gender / Persona Vibe: ${genderVibe}
- Favorite Aesthetic Styles: ${styles}
- Preferred AI Engine: ${tool}
- Top Category Affinities: ${topCategories}

Return a valid JSON with:
"title": Short compelling title (max 5 words)
"aiTool": "${tool}"
"category": Primary category name
"promptText": Fully composed, ready-to-run copy-paste prompt with optical lens, lighting, composition, and model parameters (e.g. --ar 16:9 --v 6.1)
"tags": Array of 4-6 relevant tag strings
"matchReason": One punchy sentence explaining why this matches their taste profile.`;

      const { response } = await generateWithFallback(ai, {
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

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsed });
    }

    // Action 2: Contextual AI Prompt Insights ("Why You'll Love This Pin")
    if (action === 'contextual_pin_insight') {
      if (!currentPost) {
        return NextResponse.json({ error: 'currentPost is required' }, { status: 400 });
      }

      const genderVibe = profile?.genderVibe || 'all';
      const styles = Array.isArray(profile?.favoriteStyles) ? profile.favoriteStyles.join(', ') : 'Photorealistic';

      if (!apiKey) {
        return NextResponse.json({
          success: true,
          data: {
            whyYouLikeIt: `Matches your interest in ${currentPost.category} and high-fidelity ${currentPost.aiTool || 'AI'} rendering.`,
            proTip: `For best results in ${currentPost.aiTool || 'Midjourney'}, use aspect ratio \`--ar 16:9\` and adjust stylize value between 150-250.`,
            recommendedTags: currentPost.tags ? currentPost.tags.slice(0, 4) : ['Photorealistic', '8K'],
          },
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const { response } = await generateWithFallback(ai, {
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

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsed });
    }

    // Action 4: Auto-Categorization & Tagging from Title, Prompt text & Image
    if (action === 'auto_categorize_and_tag') {
      const promptTitle = body.title || '';
      const promptContent = body.promptText || '';
      const availableCategories = Array.isArray(body.categories) && body.categories.length > 0
        ? body.categories.join(', ')
        : 'Photorealistic & Portraits, Anime & Manga, 3D Art & CGI, Sci-Fi & Cyberpunk, Landscapes & Nature, Architecture & Interiors, Fashion & Apparel, Logos & Graphic Design, Fantasy & Mythological, Photography & Vintage';

      if (!apiKey) {
        // High quality heuristic fallback
        const text = `${promptTitle} ${promptContent}`.toLowerCase();
        let cat = 'Photorealistic & Portraits';
        if (text.includes('anime') || text.includes('manga') || text.includes('ghibli') || text.includes('chibi')) cat = 'Anime & Manga';
        else if (text.includes('cyberpunk') || text.includes('sci-fi') || text.includes('neon') || text.includes('robot') || text.includes('space')) cat = 'Sci-Fi & Cyberpunk';
        else if (text.includes('3d') || text.includes('blender') || text.includes('pixar') || text.includes('octane') || text.includes('unreal')) cat = '3D Art & CGI';
        else if (text.includes('landscape') || text.includes('nature') || text.includes('forest') || text.includes('mountain') || text.includes('sunset')) cat = 'Landscapes & Nature';
        else if (text.includes('fashion') || text.includes('model') || text.includes('editorial') || text.includes('dress') || text.includes('vogue')) cat = 'Fashion & Apparel';
        else if (text.includes('logo') || text.includes('icon') || text.includes('vector') || text.includes('minimalist')) cat = 'Logos & Graphic Design';
        else if (text.includes('dragon') || text.includes('magic') || text.includes('wizard') || text.includes('fantasy')) cat = 'Fantasy & Mythological';
        else if (text.includes('vintage') || text.includes('35mm') || text.includes('film') || text.includes('retro')) cat = 'Photography & Vintage';

        let detectedTool = 'Midjourney';
        if (text.includes('gpt') || text.includes('chatgpt') || text.includes('dall-e')) detectedTool = 'ChatGPT';
        else if (text.includes('flux')) detectedTool = 'Flux';
        else if (text.includes('stable diffusion') || text.includes('sdxl')) detectedTool = 'Stable Diffusion';

        const rawTags = [
          cat,
          detectedTool,
          '8K Resolution',
          'Cinematic Lighting',
          'Masterpiece',
          'Ultra Detailed',
        ];

        return NextResponse.json({
          success: true,
          data: {
            category: cat,
            tags: rawTags,
            aiTool: detectedTool,
            suggestedTitle: promptTitle || 'Cinematic Masterpiece Prompt',
            metaDescription: promptContent.slice(0, 150) || 'High quality AI image generation prompt.',
          },
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const { response } = await generateWithFallback(ai, {
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

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ error: 'Unknown recommendation action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in recommendations API:', err);
    return NextResponse.json({ error: err?.message || 'Recommendation engine error' }, { status: 500 });
  }
}
