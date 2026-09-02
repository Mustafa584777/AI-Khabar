import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import fs from 'fs';
import path from 'path';

// Prioritized model fallback sequence
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

async function generateWithModelFallback(ai: GoogleGenAI, payload: any) {
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
      console.warn(`[Gemini Switcher] Model "${model}" failed: ${err?.message || err}. Trying next model...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate Gemini models were unavailable.');
}

function determineDynamicCategory(topic: string, defaultCat?: string, existingCategories?: string[]) {
  const text = (topic || '').toLowerCase();
  if (text.includes('anime') || text.includes('manga') || text.includes('ghibli') || text.includes('chibi') || text.includes('otaku')) return 'Anime & Manga';
  if (text.includes('fashion') || text.includes('editorial') || text.includes('outfit') || text.includes('runway') || text.includes('model') || text.includes('streetwear')) return 'Fashion & Editorial Photography';
  if (text.includes('lifestyle') || text.includes('summer') || text.includes('travel') || text.includes('cafe') || text.includes('car') || text.includes('street')) return 'Lifestyle Photography';
  if (text.includes('fantasy') || text.includes('dragon') || text.includes('magic') || text.includes('myth') || text.includes('fairy') || text.includes('elf') || text.includes('warrior')) return 'Fantasy Characters';
  if (text.includes('illustration') || text.includes('sketch') || text.includes('drawing') || text.includes('pencil') || text.includes('watercolor') || text.includes('vector')) return 'Digital Illustration & Art';
  if (text.includes('digital art') || text.includes('3d') || text.includes('render') || text.includes('cgi') || text.includes('unreal') || text.includes('concept')) return 'Digital Art & Creative Portraiture';
  
  if (existingCategories && existingCategories.length > 0) {
    const match = existingCategories.find((c) => c.toLowerCase() === (defaultCat || '').toLowerCase());
    if (match) return match;
    return existingCategories[0];
  }
  return defaultCat || 'Photorealistic & Portraits';
}

function generateFallbackPost(topic: string, tool: string, category: string, isFromImage = false) {
  const cleanTitle = (topic || 'Summer White Outfit With Vintage Car')
    .trim()
    .replace(/^["']|["']$/g, '');
  const cleanSlug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const dynamicCategory = determineDynamicCategory(cleanTitle, category);

  const promptText = `Maintain the exact facial identity of the uploaded user photo and transform the user into a hyper-realistic cinematic minimalist summer fashion portrait standing outdoors during bright daytime. The user wears a clean contemporary stylish outfit with detailed fabric textures, relaxed posture, and premium accessories, creating a fresh luxury aesthetic. Warm natural sunlight softly illuminates the face while shadows from nearby architecture add cinematic realism. The background includes modern architecture and greenery softly blurred for depth. Hair moves naturally in the warm breeze while the user looks calmly toward the camera with a confident relaxed expression. Ultra-realistic photography with detailed fabric texture and realistic daylight tones. Clear Sharp face. Quality: 8K. Aspect ratio 3:4.`;

  return {
    title: cleanTitle,
    slug: cleanSlug || 'photo-prompt-guide',
    category: dynamicCategory,
    promptText,
    negativePrompt: 'blurry, low quality, deformed anatomy, extra fingers, plastic skin, cartoon, anime, 3d render, oversaturated, watermark, signature, bad lighting',
    suggestedParameters: {
      aspectRatio: '3:4',
      model: 'v6.1',
      stylize: '250',
      steps: '30',
      cfgScale: '7.0',
      lighting: 'Warm natural directional sunlight',
      camera: 'Sony A7R V with 85mm f/1.4 GM lens',
      renderEngine: 'Photographic Realism',
    },
    tags: [
      'Photorealistic',
      '8K Resolution',
      'Cinematic Lighting',
      'Masterpiece',
      dynamicCategory,
    ],
    seo: {
      metaTitle: `${cleanTitle} | Trending Copy Paste Photo Prompts`,
      metaDescription: `Copy and paste this ${tool || 'Gemini'} photo prompt for ${cleanTitle}. Includes lighting dynamics, camera specs, and pro tips.`,
      focusKeyword: cleanTitle,
    },
    articleContent: `## How to Use This Prompt\n\nRun this prompt in **${tool || 'ChatGPT / Midjourney / Gemini'}** to produce studio-grade photorealistic results.\n\n### Key Visual Features\n- **Subject**: Clean styling with authentic skin textures and natural eye contact.\n- **Lighting**: Warm directional daylight with soft fill and realistic shadows.\n- **Optics**: 85mm portrait focal length with natural shallow depth of field.\n\n### Pro Tips\n1. Use an aspect ratio of \`3:4\` or \`4:5\` for portrait and social media feeds.\n2. Keep stylized parameter values balanced to ensure maximum photorealism without AI plastic texture.`,
  };
}

const ADMIN_POST_GENERATOR_SYSTEM_INSTRUCTION = `You are a world-class prompt engineer and AI photography art director specializing in ChatGPT, Midjourney v6.1, Flux, and Gemini.
Your job is to generate comprehensive, production-grade photo prompt packages for a premier prompt directory (trendinggeminiprompts.com).

PROMPT WRITING FORMAT:

1. FOR PORTRAITS / PEOPLE / FASHION / LIFESTYLE:
Structure the prompt as:
"Maintain the exact facial identity of the uploaded user photo and transform the user into a hyper-realistic cinematic [theme/setting, e.g. minimalist summer fashion portrait] [pose/location, e.g. standing outdoors during bright daytime]. The user wears [detailed description of exact outfit, fabrics, colors, textures, shoes, accessories]. [Lighting description: e.g. Warm natural sunlight softly illuminates the face while shadows from nearby trees add cinematic realism]. [Background description: e.g. The background includes modern architecture, greenery, and sky softly blurred for depth]. [Hair & expression: e.g. Hair moves naturally in the breeze while the user looks calmly toward the camera with a confident relaxed expression]. Ultra-realistic photography with detailed fabric texture and realistic daylight tones. Clear Sharp face. Quality: 8K. Aspect ratio [e.g. 3:4, 16:9, or 1:1]."

2. FOR ARTISTIC / DIGITAL ART / OBJECTS / VEHICLES / SKETCHES / 3D:
"A highly detailed, [cinematic / photorealistic / pencil sketch / digital art] of [specific subject, exact materials, color, design, and condition]. [Surrounding environment, props, and textures]. [Camera angle, composition, depth]. [Lighting sources, soft shadows, warm atmosphere]. 8K resolution, masterpiece quality. Aspect ratio [ratio]."

CRITICAL DIRECTIVES:
- Every prompt MUST be 100% concrete, deeply specific, actionable, and ready to run immediately.
- NEVER use generic bracketed placeholders such as [subject], [camera_lens], [lighting], or any brackets [...].
- Category matching: Assign the post to the most appropriate category from the provided platform category list.
- Tags: Output 5-8 relevant, unique tags (excluding the category name itself).
- Markdown Article: Provide an engaging, helpful guide explaining the visual components (Subject, Lighting, Composition) and pro tips.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, topic, tool, rawPrompt, category, categories, mode, image } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // =========================================================================
    // ACTION: GENERATE FULL POST (Admin CMS Copilot)
    // =========================================================================
    if (action === 'generate_full_post') {
      const isImageMode = mode === 'image' || (!!image && mode !== 'title');
      const existingCatsList = Array.isArray(categories) && categories.length > 0
        ? categories.join(', ')
        : 'Lifestyle Photography, Photorealistic & Portraits, Digital Art & Creative Portraiture, Fashion & Editorial Photography, Anime & Manga, Fantasy Characters, Digital Illustration & Art';

      if (!apiKey) {
        const fallbackData = generateFallbackPost(topic || 'Featured Photo Prompt', tool, category, isImageMode);
        return NextResponse.json({ success: true, data: fallbackData, fallback: true });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const settings = await ServerStorage.getSettings().catch(() => null);
      const customIns = settings?.geminiCustomInstructions || '';

      let contentsPayload: any;

      if (isImageMode && image) {
        let mimeType = 'image/jpeg';
        let base64Data = '';

        if (image.startsWith('data:')) {
          const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          }
        } else if (image.startsWith('http')) {
          try {
            const imgRes = await fetch(image);
            const arrayBuffer = await imgRes.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString('base64');
            mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          } catch (fetchErr) {
            console.warn('Failed to fetch remote image for multimodal analysis:', fetchErr);
          }
        } else if (image.startsWith('/')) {
          try {
            const filePath = path.join(process.cwd(), 'public', image);
            if (fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath);
              base64Data = fileBuffer.toString('base64');
              const ext = path.extname(image).toLowerCase();
              mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
            }
          } catch (localErr) {
            console.warn('Failed to read local image for multimodal analysis:', localErr);
          }
        }

        if (base64Data) {
          const imagePart = {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
          const textPart = {
            text: `Thoroughly inspect this uploaded photograph/artwork.
Reverse-engineer its exact aesthetic, lighting setup, subject matter, composition, color palette, camera optics, and mood into a master-level ${tool || 'ChatGPT'} prompt package.
Available Categories to select from: [${existingCatsList}].

Provide a structured JSON output with:
- "title": Catchy, descriptive title (DO NOT name it "Reverse engineer this image")
- "slug": Clean url slug
- "category": Most accurate category from [${existingCatsList}]
- "promptText": Master copy-paste prompt following the required style guidelines
- "negativePrompt": Clean negative prompt
- "suggestedParameters": { aspectRatio, model, stylize, steps, cfgScale, lighting, camera, renderEngine }
- "tags": array of 5-8 relevant tags
- "seo": { metaTitle, metaDescription, focusKeyword }
- "articleContent": rich markdown article explaining the prompt breakdown and pro tips.`,
          };
          contentsPayload = [imagePart, textPart];
        } else {
          contentsPayload = `Create a complete prompt post based on image concept: "${topic || 'Photorealistic Artwork'}" for ${tool || 'ChatGPT'}. Available Categories: [${existingCatsList}].`;
        }
      } else {
        contentsPayload = `Create a complete, master-level prompt post for:
Topic / Concept: "${topic || 'Summer White Outfit With Vintage Car'}"
Target AI Platform: "${tool || 'ChatGPT'}"
Available Categories: [${existingCatsList}]

Provide structured JSON output with title, slug, category, promptText, negativePrompt, suggestedParameters, tags (5-8 unique tags), seo, and articleContent.`;
      }

      const jsonSchemaConfig = {
        systemInstruction: `${ADMIN_POST_GENERATOR_SYSTEM_INSTRUCTION}${customIns ? `\n\nUSER CUSTOM INSTRUCTIONS:\n${customIns}` : ''}`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slug: { type: Type.STRING },
            category: { type: Type.STRING },
            promptText: { type: Type.STRING },
            negativePrompt: { type: Type.STRING },
            suggestedParameters: {
              type: Type.OBJECT,
              properties: {
                aspectRatio: { type: Type.STRING },
                model: { type: Type.STRING },
                stylize: { type: Type.STRING },
                steps: { type: Type.STRING },
                cfgScale: { type: Type.STRING },
                lighting: { type: Type.STRING },
                camera: { type: Type.STRING },
                renderEngine: { type: Type.STRING },
              },
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            seo: {
              type: Type.OBJECT,
              properties: {
                metaTitle: { type: Type.STRING },
                metaDescription: { type: Type.STRING },
                focusKeyword: { type: Type.STRING },
              },
              required: ['metaTitle', 'metaDescription', 'focusKeyword'],
            },
            articleContent: { type: Type.STRING },
          },
          required: ['title', 'slug', 'category', 'promptText', 'tags', 'seo', 'articleContent'],
        },
      };

      try {
        const { response, modelUsed } = await generateWithModelFallback(ai, {
          contents: contentsPayload,
          config: jsonSchemaConfig,
        });

        const parsedData = JSON.parse(response.text || '{}');
        return NextResponse.json({ success: true, data: parsedData, modelUsed });
      } catch (geminiError: any) {
        console.warn('Gemini models error, applying smart local fallback:', geminiError?.message);
        const fallbackData = generateFallbackPost(topic || 'Featured Photo Prompt', tool, category, isImageMode);
        return NextResponse.json({ success: true, data: fallbackData, fallback: true });
      }
    }

    // =========================================================================
    // ACTION: ENHANCE PROMPT
    // =========================================================================
    if (action === 'enhance_prompt') {
      if (!apiKey) {
        return NextResponse.json({
          success: true,
          data: {
            enhancedPrompt: `${rawPrompt || 'A stunning photo'}, 8K resolution, cinematic lighting, shot on 85mm f/1.4 lens, photorealistic textures, master art direction, aspect ratio 3:4`,
            negativePrompt: 'blurry, low quality, deformed anatomy, grainy, bad composition, oversaturated',
            suggestedParameters: {
              aspectRatio: '3:4',
              model: 'v6.1',
              lighting: 'Warm natural directional light',
              camera: '85mm f/1.4 Prime',
            },
            explanation: 'Enhanced with photorealistic lighting, lens dynamics, and high fidelity textures.',
          },
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { response, modelUsed } = await generateWithModelFallback(ai, {
        contents: `Enhance this prompt to make it deeply descriptive, photorealistic, and visually stunning for ${tool || 'ChatGPT / Midjourney'}:
Input Prompt: "${rawPrompt}"

Return a JSON with "enhancedPrompt", "negativePrompt", "suggestedParameters", and "explanation".`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              enhancedPrompt: { type: Type.STRING },
              negativePrompt: { type: Type.STRING },
              suggestedParameters: {
                type: Type.OBJECT,
                properties: {
                  aspectRatio: { type: Type.STRING },
                  model: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  camera: { type: Type.STRING },
                },
              },
              explanation: { type: Type.STRING },
            },
            required: ['enhancedPrompt', 'negativePrompt'],
          },
        },
      });

      const parsedData = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsedData, modelUsed });
    }

    return NextResponse.json({ error: 'Unknown action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Gemini API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
