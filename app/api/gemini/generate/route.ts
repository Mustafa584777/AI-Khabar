import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runGeminiWithFastFallback } from '@/lib/gemini-runner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, topic, tool, rawPrompt, categories, mode, image } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    if (action === 'generate_full_post') {
      const isImageMode = mode === 'image' || (!!image && mode !== 'title');
      const existingCatsList =
        Array.isArray(categories) && categories.length > 0
          ? categories.join(', ')
          : 'Photorealistic & Portraits, Anime & Manga, 3D Art & CGI, Sci-Fi & Cyberpunk, Landscapes & Nature, Architecture & Interiors, Fashion & Apparel, Logos & Graphic Design, Fantasy & Mythological, Vehicles & Automotive';

      const systemInstruction = `You are a world-class prompt engineer and AI art director specializing in Midjourney v6, ChatGPT-4o, Flux.1, Stable Diffusion XL, Claude 3.5, and Gemini.
Generate a comprehensive, high-quality prompt package formatted for a prompt directory article.
Ensure the prompt includes rich detail with lighting, camera optics, composition, and artistic nuances.`;

      let contentsPayload: any;

      if (isImageMode && image) {
        let mimeType = 'image/jpeg';
        let base64Data = '';

        if (image.startsWith('data:')) {
          const parts = image.split(';base64,');
          if (parts.length === 2) {
            mimeType = parts[0].replace(/^data:/, '').trim() || 'image/jpeg';
            base64Data = parts[1].trim();
          }
        } else if (image.startsWith('http')) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const imgRes = await fetch(image, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              base64Data = Buffer.from(arrayBuffer).toString('base64');
              mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            }
          } catch (fetchErr) {
            console.warn('Failed to fetch remote image for multimodal analysis:', fetchErr);
          }
        } else if (image.startsWith('/')) {
          try {
            const publicPath = path.join(process.cwd(), 'public', image.replace(/^\//, ''));
            if (fs.existsSync(publicPath)) {
              const buffer = fs.readFileSync(publicPath);
              base64Data = buffer.toString('base64');
              const ext = path.extname(publicPath).toLowerCase();
              if (ext === '.webp') mimeType = 'image/webp';
              else if (ext === '.png') mimeType = 'image/png';
              else mimeType = 'image/jpeg';
            }
          } catch (fsErr) {
            console.warn('Failed to read local image for multimodal analysis:', fsErr);
          }
        }

        if (base64Data) {
          contentsPayload = [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: `Thoroughly inspect and reverse-engineer this attached photograph/artwork.
Reverse-engineer its exact aesthetic, lighting setup, subject matter, composition, color palette, camera optics, and mood into a master-level ${tool || 'Midjourney'} ready-to-run prompt package.

Category Instructions:
Select the most accurate category from platform categories: [${existingCatsList}], OR if none is a good fit, generate a clean, concise, relevant new category name.

Provide structured JSON output with title, slug, category, promptText, negativePrompt, suggestedParameters, tags (5-8 unique tags), seo, and articleContent.`,
            },
          ];
        } else {
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

      const { parsedJson, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
        apiKey,
        expectJson: true,
        maxTotalMs: 13500,
        contents: contentsPayload,
        config: {
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
        },
      });

      return NextResponse.json({ success: true, data: parsedJson, modelUsed, elapsedMs });
    }

    if (action === 'enhance_prompt') {
      const { parsedJson, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
        apiKey,
        expectJson: true,
        maxTotalMs: 13500,
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

      return NextResponse.json({ success: true, data: parsedJson, modelUsed, elapsedMs });
    }

    return NextResponse.json({ error: 'Unknown action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Gemini API Route Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process AI request' },
      { status: 503 }
    );
  }
}
