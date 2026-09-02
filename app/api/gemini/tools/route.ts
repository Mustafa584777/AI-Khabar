import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

// Multi-model fallback sequence ensuring reliability
const CANDIDATE_MODELS = [
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
];

async function generateWithModel(ai: GoogleGenAI, preferredModel: string | undefined, payload: any) {
  const modelsToTry = [
    preferredModel && !preferredModel.includes('imagen') && !preferredModel.includes('2.5') ? preferredModel : 'gemini-3.7-flash',
    ...CANDIDATE_MODELS,
  ];

  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));
  let lastErr: any = null;

  for (const modelToUse of uniqueModels) {
    try {
      const res = await ai.models.generateContent({
        ...payload,
        model: modelToUse,
      });

      if (res && res.text) {
        return { response: res, modelUsed: modelToUse };
      }
    } catch (err: any) {
      console.warn(`[Gemini Tools API] Model "${modelToUse}" failed:`, err?.message || err);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All candidate Gemini models failed to generate response');
}

// Fallback reverse-prompt generator when offline or API key missing
function generateLocalImageToPrompt(customInstructions?: string) {
  const instructions = customInstructions ? ` with modifications: ${customInstructions}` : '';
  return {
    title: 'Cinematic Minimalist Fashion Portrait',
    summary: 'A hyper-realistic cinematic portrait with warm natural sunlight, relaxed luxury aesthetic, and detailed daylight tones.',
    analysis: {
      subject: 'Subject in contemporary styling, calm and confident expression, sharp facial clarity with natural micro-textures',
      pose: 'Standing naturally, relaxed posture with shoulders slightly turned toward the camera',
      composition: 'Cinematic medium shot, centered subject framing with beautifully blurred background depth',
      environment: 'Modern architectural outdoor setting with natural greenery and soft daytime ambient atmosphere',
      camera: 'Sony A7R V with 85mm f/1.4 G-Master lens, shallow depth of field, natural bokeh',
      lighting: 'Warm natural directional sunlight with soft ambient fill and realistic shadows',
      color_grading: 'Natural warm daylight tones, neutral skin tones, rich contrast and deep blacks',
      effects: 'Crisp subject focus, natural fabric weave details, authentic daylight rendering without artificial smoothing',
      text_and_layout: 'None',
    },
    prompt: `Maintain the exact facial identity of the uploaded user photo and transform the user into a hyper-realistic cinematic minimalist portrait standing outdoors during bright daytime${instructions}. The user wears a stylish contemporary outfit with premium accessories, creating a fresh luxury aesthetic. Warm natural sunlight softly illuminates the face while soft shadows add cinematic realism. The background includes modern architecture and greenery softly blurred for depth. Ultra-realistic photography with detailed fabric texture and realistic daylight tones. Clear Sharp face. Quality: 8K. Aspect ratio 3:4.`,
    promptText: `Maintain the exact facial identity of the uploaded user photo and transform the user into a hyper-realistic cinematic minimalist portrait standing outdoors during bright daytime${instructions}. The user wears a stylish contemporary outfit with premium accessories, creating a fresh luxury aesthetic. Warm natural sunlight softly illuminates the face while soft shadows add cinematic realism. The background includes modern architecture and greenery softly blurred for depth. Ultra-realistic photography with detailed fabric texture and realistic daylight tones. Clear Sharp face. Quality: 8K. Aspect ratio 3:4.`,
    negative_prompt: 'blurry, low quality, deformed anatomy, extra fingers, plastic skin, cartoon, anime, 3d render, oversaturated, watermark, signature, bad lighting',
    negativePrompt: 'blurry, low quality, deformed anatomy, extra fingers, plastic skin, cartoon, anime, 3d render, oversaturated, watermark, signature, bad lighting',
    aspect_ratio: '3:4',
    aspectRatio: '3:4',
    confidence: 'high',
    camera: 'Sony A7R V with 85mm f/1.4 GM',
    lighting: 'Warm natural directional sunlight',
    composition: 'Cinematic medium portrait with shallow depth of field',
    colorPalette: 'Warm golden daylight and neutral natural tones',
    tags: ['Reverse Engineered', 'Photorealistic', 'Natural Lighting', 'Master Prompt', '8K Quality'],
  };
}

const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = `You are an elite master prompt engineer and AI photography director.
Your mission is to inspect the uploaded image and generate a flawless, copy-paste-ready AI photo prompt that reproduces the image's aesthetic, subject, lighting, styling, and atmosphere in AI generators (ChatGPT / Midjourney / Gemini / Stable Diffusion).

CORE PROMPT STRUCTURE RULES:

1. FOR PORTRAITS / PEOPLE / FASHION:
Start the prompt with:
"Maintain the exact facial identity of the uploaded user photo and transform the user into a hyper-realistic cinematic [style/setting, e.g. minimalist summer fashion portrait] [pose/location, e.g. standing outdoors during bright daytime]. The user wears [detailed description of exact outfit, fabrics, colors, textures, shoes, accessories]. [Lighting description: e.g. Warm natural sunlight softly illuminates the face while shadows from nearby trees add cinematic realism]. [Background description: e.g. The background includes modern architecture, greenery, and sky softly blurred for depth]. [Hair & expression: e.g. Hair moves naturally in the breeze while the user looks calmly toward the camera with a confident relaxed expression]. Ultra-realistic photography with detailed fabric texture and realistic daylight tones. Clear Sharp face. Quality: 8K. Aspect ratio [detected ratio, e.g. 3:4, 16:9, 1:1, or 9:16]."

2. FOR ARTISTIC / OBJECTS / VEHICLES / LANDSCAPES / SKETCHES / 3D ART:
Format the prompt as a vivid, highly detailed description:
"A highly detailed, [cinematic / photorealistic / digital art / 3D render] of [specific subject, exact materials, color, design, and condition]. [Environment & background details]. [Camera angle, perspective, composition, lens depth]. [Lighting rig, shadows, volumetric rays, reflections, atmosphere]. 8K resolution, masterpiece quality. Aspect ratio [detected ratio]."

CRITICAL QUALITY DIRECTIVES:
- NEVER use generic bracket placeholders like [subject], [clothing], [lighting], or [camera]. Write out every single detail vividly and concretely.
- Capture the genuine aesthetic: lighting direction, shadows, color temperature, fabric weaves, atmospheric depth, and camera optics.
- Return a valid, well-formed JSON object matching the required schema.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      image,
      customInstructions,
      styleFocus,
      selectedModel,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // =========================================================================
    // ACTION: IMAGE TO PROMPT (Reverse-engineering from image)
    // =========================================================================
    if (action === 'image_to_prompt') {
      if (!image) {
        return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
      }

      const settings = await ServerStorage.getSettings().catch(() => null);
      const globalCustom = settings?.geminiCustomInstructions || '';
      const activeInstructions = [globalCustom, customInstructions, styleFocus].filter(Boolean).join('\n\n');

      if (!apiKey) {
        const fallback = generateLocalImageToPrompt(activeInstructions);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Parse image base64 data
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
      }

      if (!base64Data) {
        const fallback = generateLocalImageToPrompt(activeInstructions);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }

      const promptInstruction = `Inspect this uploaded image thoroughly and reverse-engineer its full visual DNA.
Reconstruct the master AI prompt that will accurately generate this image.
${activeInstructions ? `USER CUSTOM INSTRUCTIONS & MODIFICATIONS:
Apply the following requested modifications into the final prompt and parameters:
"${activeInstructions}"` : ''}

Generate structured JSON with:
- "title": Clean, catchy title for the prompt
- "summary": One-sentence summary of the visual style
- "analysis": { subject, pose, composition, environment, camera, lighting, color_grading, effects, text_and_layout }
- "prompt": The complete, copy-paste-ready master prompt
- "negative_prompt": Clean negative prompt
- "aspect_ratio": Detected aspect ratio (e.g. "3:4", "16:9", "1:1", "9:16")
- "confidence": "high"`;

      const jsonSchemaConfig = {
        systemInstruction: IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short descriptive title' },
            summary: { type: Type.STRING, description: 'One sentence describing the visual concept' },
            analysis: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                pose: { type: Type.STRING },
                composition: { type: Type.STRING },
                environment: { type: Type.STRING },
                camera: { type: Type.STRING },
                lighting: { type: Type.STRING },
                color_grading: { type: Type.STRING },
                effects: { type: Type.STRING },
                text_and_layout: { type: Type.STRING },
              },
              required: ['subject', 'pose', 'composition', 'environment', 'camera', 'lighting', 'color_grading'],
            },
            prompt: { type: Type.STRING, description: 'Complete copy-paste-ready image generation prompt' },
            negative_prompt: { type: Type.STRING, description: 'Complete negative prompt' },
            aspect_ratio: { type: Type.STRING, description: 'Detected aspect ratio' },
            confidence: { type: Type.STRING, description: 'high | medium | low' },
          },
          required: ['title', 'summary', 'analysis', 'prompt', 'negative_prompt', 'aspect_ratio', 'confidence'],
        },
      };

      try {
        const { response, modelUsed } = await generateWithModel(ai, selectedModel, {
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptInstruction,
              },
            ],
          },
          config: jsonSchemaConfig,
        });

        const parsed = JSON.parse(response.text || '{}');

        const normalizedData = {
          ...parsed,
          promptText: parsed.prompt || parsed.promptText || '',
          negativePrompt: parsed.negative_prompt || parsed.negativePrompt || '',
          aspectRatio: parsed.aspect_ratio || parsed.aspectRatio || '3:4',
          camera: parsed.analysis?.camera || parsed.camera || 'Sony A7R V with 85mm f/1.4 GM',
          lighting: parsed.analysis?.lighting || parsed.lighting || 'Warm natural sunlight',
          composition: parsed.analysis?.composition || parsed.composition || 'Cinematic medium portrait with shallow depth of field',
          colorPalette: parsed.analysis?.color_grading || parsed.colorPalette || 'Warm daylight and neutral natural tones',
          tags: [
            'Reverse Engineered',
            'Photorealistic',
            parsed.analysis?.subject ? 'Subject Matched' : 'Master Prompt',
            '8K Quality',
          ].filter(Boolean),
        };

        return NextResponse.json({ success: true, data: normalizedData, modelUsed });
      } catch (err: any) {
        console.warn('Gemini vision model failed, using high-quality local fallback:', err?.message);
        const fallback = generateLocalImageToPrompt(activeInstructions);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Studio Tools Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI tool request' },
      { status: 500 }
    );
  }
}
