import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import fs from 'fs';
import path from 'path';

// Prioritized model fallback sequence: if one model fails or is unavailable, switch to the next
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Reusable executor that tries candidate models in sequence
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
      console.warn(`[Gemini Switcher] Model "${model}" failed: ${err?.message || err}. Switching to next candidate...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate Gemini models were unavailable.');
}

// Deterministic heuristic generator for resilient offline/fallback scenarios
function determineDynamicCategory(topic: string, defaultCat?: string) {
  const text = (topic || '').toLowerCase();
  if (text.includes('cyber') || text.includes('sci-fi') || text.includes('robot') || text.includes('future') || text.includes('mecha')) return 'Sci-Fi & Cyberpunk';
  if (text.includes('anime') || text.includes('manga') || text.includes('ghibli') || text.includes('chibi') || text.includes('otaku')) return 'Anime & Manga';
  if (text.includes('car') || text.includes('vehicle') || text.includes('supercar') || text.includes('auto') || text.includes('bike')) return 'Vehicles & Automotive';
  if (text.includes('architecture') || text.includes('interior') || text.includes('room') || text.includes('villa') || text.includes('building')) return 'Architecture & Interiors';
  if (text.includes('nature') || text.includes('animal') || text.includes('landscape') || text.includes('forest') || text.includes('ocean') || text.includes('wildlife')) return 'Landscapes & Nature';
  if (text.includes('logo') || text.includes('vector') || text.includes('icon') || text.includes('branding') || text.includes('sticker')) return 'Logos & Graphic Design';
  if (text.includes('3d') || text.includes('render') || text.includes('blender') || text.includes('cgi') || text.includes('unreal') || text.includes('isometric')) return '3D Art & CGI';
  if (text.includes('fantasy') || text.includes('dragon') || text.includes('magic') || text.includes('myth') || text.includes('fairy')) return 'Fantasy & Mythological';
  if (text.includes('vintage') || text.includes('35mm') || text.includes('retro') || text.includes('analog') || text.includes('film')) return 'Photography & Vintage';
  if (text.includes('fashion') || text.includes('outfit') || text.includes('streetwear') || text.includes('dress') || text.includes('runway')) return 'Fashion & Apparel';
  return defaultCat || 'Photorealistic & Portraits';
}

function generateFallbackPost(topic: string, tool: string, category: string, isFromImage = false) {
  const cleanTitle = (topic || 'Cinematic Photo Composition')
    .trim()
    .replace(/^["']|["']$/g, '');
  const cleanSlug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const dynamicCategory = determineDynamicCategory(cleanTitle, category);

  const promptText = isFromImage
    ? `Masterpiece photograph of [subject], captured with [camera_lens], cinematic [lighting_setup], natural color grade, photorealistic textures, shallow depth of field, 8K ultra high detail, aesthetic studio art direction --ar 16:9 --v 6.1`
    : `Editorial portrait of [subject], atmospheric [lighting], rich cinematic contrast, shot on [camera_angle], 85mm f/1.4 lens, hyper-detailed skin texture and fabrics, masterpiece quality --ar 16:9 --v 6.1`;

  return {
    title: cleanTitle,
    slug: cleanSlug || 'cinematic-photo-prompt',
    category: dynamicCategory,
    promptText,
    negativePrompt: 'blurry, low quality, deformed anatomy, extra fingers, cartoonish, oversaturated, watermark, bad lighting, grainy artifacts',
    suggestedParameters: {
      aspectRatio: '16:9',
      model: 'v6.1',
      stylize: '250',
      steps: '30',
      cfgScale: '7.0',
      lighting: 'Golden Hour Soft Rim Lighting',
      camera: 'Sony A7R V with 85mm f/1.4 GM',
      renderEngine: 'Raw Photographic Rendering',
    },
    tags: [
      tool || 'Midjourney',
      dynamicCategory,
      '8K Resolution',
      'Cinematic Lighting',
      'Editorial Photo',
      'Copy Paste Prompt',
    ],
    seo: {
      metaTitle: `${cleanTitle} | Trending Copy Paste Photo Prompts`,
      metaDescription: `Copy and paste this ${tool || 'Midjourney'} prompt for ${cleanTitle}. Includes calibrated camera parameters, lighting breakdown, and pro tips.`,
      focusKeyword: cleanTitle,
    },
    articleContent: `## About This Prompt

This prompt is crafted to produce clean, hyper-realistic imagery on **${tool || 'Midjourney'}**. By specifying lighting dynamics, lens physics, and realistic textures, you achieve studio-grade results without artificial plastic finishes.

### Composition & Optics Breakdown
- **Subject Framing**: High-definition focus on ${cleanTitle} with authentic surface micro-details.
- **Lighting Dynamics**: Soft volumetric rim light with subtle warm highlights.
- **Lens & Optics**: Sony A7R V with 85mm f/1.4 G-Master lens physics.

### Pro Tips for Highest Quality
1. **Focal Length**: Use 85mm or 50mm lenses for portraits to minimize distortion.
2. **Aspect Ratio**: Keep \`--ar 16:9\` for landscapes and \`--ar 4:5\` for mobile-optimized social posts.
3. **Stylize Value**: Set \`--s 150\` to \`--s 300\` for the optimal balance between prompt obedience and photorealism.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, topic, tool, rawPrompt, category, categories, mode, image } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // Handle full post generation
    if (action === 'generate_full_post') {
      const isImageMode = mode === 'image' || (!!image && mode !== 'title');
      const existingCatsList = Array.isArray(categories) && categories.length > 0
        ? categories.join(', ')
        : 'Photorealistic & Portraits, Anime & Manga, 3D Art & CGI, Sci-Fi & Cyberpunk, Landscapes & Nature, Architecture & Interiors, Fashion & Apparel, Logos & Graphic Design, Fantasy & Mythological, Vehicles & Automotive';

      // If API key is not present, return high-quality heuristic generation
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
      const systemInstruction = `You are a world-class prompt engineer and AI art director specializing in Midjourney v6, ChatGPT-4o, Flux.1, Stable Diffusion XL, Claude 3.5, and Gemini.
Generate a comprehensive, high-quality prompt package formatted for a prompt directory article like trendinggeminiprompts.com.
Ensure the prompt includes dynamic variable placeholders like [subject], [lighting], [style] so users can customize them.
${customIns ? `\nUSER CUSTOM SYSTEM INSTRUCTIONS & GUIDELINES:\n${customIns}` : ''}`;

      let contentsPayload: any;

      if (isImageMode && image) {
        // Extract base64 image data or fetch remote image
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
            text: `Thoroughly inspect and reverse-engineer this attached photograph/artwork.
Reverse-engineer its exact aesthetic, lighting setup, subject matter, composition, color palette, camera optics, and mood into a master-level ${tool || 'Midjourney'} ready-to-run prompt package.

Category Instructions:
Select the most accurate category from platform categories: [${existingCatsList}], OR if none is a good fit, generate a clean, concise, relevant new category name (e.g. "Cyberpunk & Sci-Fi", "Anime & Manga", "Luxury Vehicles", "Architecture & Interior", "Wildlife & Nature", "Fantasy Characters", "Food Photography", etc.).

Provide a structured JSON output with:
- "title": Compelling concise title
- "slug": URL slug
- "category": Most accurate category name
- "promptText": fully formed, ready-to-copy photographic prompt without placeholder brackets
- "negativePrompt": negative prompt
- "suggestedParameters": aspectRatio, model, stylize, steps, cfgScale, lighting, camera, renderEngine
- "tags": array of 5-8 relevant, unique tags (exclude duplicate category names)
- "seo": metaTitle, metaDescription, focusKeyword
- "articleContent": rich markdown guide explaining how the prompt works, lighting/camera breakdowns, parameter settings, and pro tips.`,
          };
          contentsPayload = [imagePart, textPart];
        } else {
          // Fallback to text prompt
          contentsPayload = `Create a complete prompt post based on image concept: "${topic || 'Photorealistic Artwork'}" for ${tool || 'Midjourney'}. Available Categories: [${existingCatsList}].`;
        }
      } else {
        contentsPayload = `Create a complete, master-level prompt post for:
Topic / Idea: "${topic || 'Futuristic cybernetic portrait'}"
Target AI Platform: "${tool || 'Midjourney'}"
Available Categories: [${existingCatsList}]

Task:
1. Classify into the most accurate category from [${existingCatsList}] or generate a clean, concise, relevant new category name.
2. Provide structured JSON output with title, slug, category, promptText, negativePrompt, suggestedParameters, tags array (5-8 unique tags), seo, and articleContent.`;
      }

      const jsonSchemaConfig = {
        systemInstruction,
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

    if (action === 'enhance_prompt') {
      if (!apiKey) {
        return NextResponse.json({
          success: true,
          data: {
            enhancedPrompt: `${rawPrompt || 'A stunning photo'}, 8K resolution, cinematic lighting, shot on 85mm f/1.4 lens, photorealistic textures, master art direction --ar 16:9 --v 6.1`,
            negativePrompt: 'blurry, low quality, deformed anatomy, grainy, bad composition',
            suggestedParameters: {
              aspectRatio: '16:9',
              model: 'v6.1',
              lighting: 'Dramatic Rim Light',
              camera: '85mm f/1.4 Prime',
            },
            explanation: 'Enhanced with professional camera framing and lighting tokens.',
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
        contents: `Enhance this prompt to make it photographic, detailed, and visually breathtaking for ${tool || 'Midjourney'}:
Input Prompt: "${rawPrompt}"

Return a JSON with "enhancedPrompt", "negativePrompt", "suggestedParameters" and "explanation".`,
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

