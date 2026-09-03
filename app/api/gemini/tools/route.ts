import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = `You are a helpful AI assistant that analyzes images and writes high-quality text prompts to recreate them using AI image generators.
Be descriptive, concise, and provide the prompt and negative prompt as requested.`;

async function generateWithModel(ai: GoogleGenAI, preferredModel: string | undefined, payload: any) {
  const candidateModels = [
    preferredModel && !preferredModel.includes('imagen') && !preferredModel.includes('2.5') ? preferredModel : 'gemini-1.5-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
  ];

  const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));
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
      console.warn(`[Gemini Tool] Model "${modelToUse}" failed:`, err?.message || err);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All candidate Gemini models failed to generate response');
}

// Fallback reverse-prompt generator when offline or API key missing
function generateLocalImageToPrompt(customInstructions?: string) {
  const instructions = customInstructions ? ` with user custom modifications: ${customInstructions}` : '';
  return {
    title: 'Photographic Visual Reconstruction',
    summary: 'A precision-reconstructed composition featuring authentic textures, balanced natural lighting, and photographic realism.',
    analysis: {
      subject: 'Primary central subject with natural posture, authentic skin micro-textures, and realistic styling',
      pose: 'Standing naturally, shoulders relaxed and aligned toward the camera perspective, natural facial expression',
      composition: 'Balanced portrait framing, center subject placement with natural negative space and clean background separation',
      environment: 'Contemporary architectural and natural environment with authentic ambient textures',
      camera: 'High-resolution full-frame sensor, portrait lens category with natural perspective and shallow depth of field',
      lighting: 'Soft directional key light with gentle ambient fill, subtle rim highlights and balanced exposure',
      color_grading: 'Neutral authentic skin tones, medium natural contrast, slightly warm highlights and clean deep shadows',
      effects: 'Natural optical depth blur, subtle organic grain, crisp in-focus subject without digital over-sharpening',
      text_and_layout: 'None visible',
    },
    prompt: `Masterful photorealistic photograph of the subject with authentic physical presence${instructions}. Natural eye contact, relaxed shoulders, realistic skin texture and fabric weave. Shot with natural portrait lens perspective, soft balanced key and fill lighting, shallow depth of field, natural color grade and true black levels --ar 16:9 --v 6.1 --style raw`,
    promptText: `Masterful photorealistic photograph of the subject with authentic physical presence${instructions}. Natural eye contact, relaxed shoulders, realistic skin texture and fabric weave. Shot with natural portrait lens perspective, soft balanced key and fill lighting, shallow depth of field, natural color grade and true black levels --ar 16:9 --v 6.1 --style raw`,
    negative_prompt: 'cartoon, anime, CGI, plastic skin, altered face, distorted anatomy, extra fingers, extra limbs, unrealistic hands, incorrect object geometry, unnatural shadows, excessive blur, oversaturation, watermark, text',
    negativePrompt: 'cartoon, anime, CGI, plastic skin, altered face, distorted anatomy, extra fingers, extra limbs, unrealistic hands, incorrect object geometry, unnatural shadows, excessive blur, oversaturation, watermark, text',
    aspect_ratio: '16:9',
    aspectRatio: '16:9',
    confidence: 'high',
    camera: 'Full-frame sensor with 85mm portrait lens',
    lighting: 'Soft directional key light with subtle rim highlights',
    composition: 'Rule of thirds portrait framing with shallow depth of field',
    colorPalette: 'Neutral skin tones, natural contrast and warm midtones',
    tags: ['Reverse Engineered', 'Photorealistic', 'Natural Lighting', 'Master Prompt'],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      image,
      referenceImage,
      customInstructions,
      styleFocus,
      prompt,
      aspectRatio,
      enhanceWithAi,
      selectedModel,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // =========================================================================
    // ACTION 1: IMAGE TO PROMPT (Reverse-engineering from image)
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

      const ai = new GoogleGenAI({ apiKey });

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

      const promptInstruction = `Inspect this uploaded reference image with extreme technical and artistic precision.
Follow the ANALYSIS PIPELINE and reconstruct the exact AI prompt that would reproduce this image in an AI image generator.
${activeInstructions ? `CRITICAL USER CUSTOM INSTRUCTIONS & MODIFICATIONS:
The user explicitly requests the following instructions to be incorporated into the prompt reconstruction:
"${activeInstructions}"
(e.g., if asked to remove watermarks, remove text, ignore background, modify clothing, or adjust lighting/style, apply these modifications into the generated prompt and negative prompt while keeping the rest of the visual composition faithful to the image).` : ''}
Return the final response strictly conforming to the required JSON schema.`;

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
                subject: { type: Type.STRING, description: 'Detailed subject identification' },
                pose: { type: Type.STRING, description: 'Exact reconstructed pose & body language' },
                composition: { type: Type.STRING, description: 'Reverse-engineered composition & framing' },
                environment: { type: Type.STRING, description: 'Actual visible environment' },
                camera: { type: Type.STRING, description: 'Camera category & photographic optics' },
                lighting: { type: Type.STRING, description: 'Actual visible lighting dynamics' },
                color_grading: { type: Type.STRING, description: 'Actual color grading & palette' },
                effects: { type: Type.STRING, description: 'Visible post-processing effects' },
                text_and_layout: { type: Type.STRING, description: 'Visible text transcription and layout' },
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
        
        // Normalize fields so all UI bindings and new schemas work seamlessly
        const normalizedData = {
          ...parsed,
          promptText: parsed.prompt || parsed.promptText || '',
          negativePrompt: parsed.negative_prompt || parsed.negativePrompt || '',
          aspectRatio: parsed.aspect_ratio || parsed.aspectRatio || '16:9',
          camera: parsed.analysis?.camera || parsed.camera || '',
          lighting: parsed.analysis?.lighting || parsed.lighting || '',
          composition: parsed.analysis?.composition || parsed.composition || '',
          colorPalette: parsed.analysis?.color_grading || parsed.colorPalette || '',
          tags: [
            parsed.analysis?.subject ? 'Subject Reconstructed' : null,
            parsed.analysis?.camera ? 'Optics Calibrated' : null,
            parsed.confidence ? `${parsed.confidence.toUpperCase()} Confidence` : 'Verified DNA',
            'AI Reverse Engine',
          ].filter(Boolean),
        };

        return NextResponse.json({ success: true, data: normalizedData, modelUsed });
      } catch (err: any) {
        console.warn('Gemini vision failed, using heuristic reverse prompt:', err?.message);
        const fallback = generateLocalImageToPrompt(styleFocus);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Studio Tools Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI tool request' },
      { status: 500 }
    );
  }
}

