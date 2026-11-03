import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ensureAspectRatio34 } from '@/lib/utils';

const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = `You are an elite expert image-to-prompt reconstruction engine, professional photographer, cinematographer, art director, and fashion stylist simultaneously.

Your task is to analyze the uploaded reference image with extremely high technical and artistic precision and convert it into a comprehensive, production-ready, highly detailed image generation prompt following the MASTER VISUAL REFERENCE format.

You MUST NOT generate a short or generic description. Every detail must be meticulously reverse-engineered and described in rich depth (150-300 words).

MASTER VISUAL REFERENCE STRUCTURE FOR THE PROMPT:
1. SUBJECT: Detailed demographic, physical presence, realistic skin micro-texture, expression, and gaze.
2. EXPRESSION & GAUGE: Precise facial expression, eye contact, mood.
3. POSE & BODY LANGUAGE: Exact posture, head tilt, shoulder orientation, hand placement.
4. COMPOSITION & FRAMING: Aspect ratio, subject placement, camera angle, distance, framing, negative space.
5. CAMERA & OPTICS: Lens category (e.g., 85mm f/1.4 portrait lens), aperture, sensor characteristics, depth of field, sharpness, bokeh.
6. CLOTHING & ACCESSORIES: Each visible garment described by type, color, material, texture, fit, folds, layering, jewelry.
7. HAIR: Hairstyle, volume, texture, loose strands framing face.
8. LIGHTING & SHADOWS: Key light, fill light, rim highlights, soft directional studio lighting, shadow softness and falloff.
9. BACKGROUND & ENVIRONMENT: Backdrop texture, color, lighting falloff, environmental elements.
10. COLOR PALETTE & COLOR GRADING: Dominant tones, contrast, saturation, white balance.
11. IMAGE TEXTURE & PHOTOGRAPHIC CHARACTER: Film grain, sensor noise, organic texture, raw realism.

OUTPUT FORMAT:
Return ONLY valid JSON matching the required schema with a masterfully written, highly comprehensive detailed prompt string in the "prompt" field. The prompt MUST always specify and end with ", aspect ratio 3:4".`;

async function generateWithModel(ai: GoogleGenAI, preferredModel: string | undefined, payload: any) {
  const candidateModels = [
    preferredModel && preferredModel !== 'imagen-3.0-generate-002' ? preferredModel : 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-pro',
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      image,
      idea,
      lighting,
      colorGrading,
      gender,
      aspectRatio,
      referenceImage,
      styleFocus,
      customInstructions,
      prompt,
      enhanceWithAi,
      selectedModel,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // =========================================================================
    // ACTION: IDEA TO DETAILED PROMPT GENERATOR
    // =========================================================================
    if (action === 'idea_to_prompt' || action === 'generate_prompt') {
      const userIdea = (idea || prompt || '').trim();
      if (!userIdea) {
        return NextResponse.json({ error: 'Please provide an idea or short description.' }, { status: 400 });
      }

      const chosenLighting = lighting || 'Natural Daylight (Realistic Smartphone Photograph)';
      const chosenColor = colorGrading || 'Natural Color Palette';
      const chosenGender = gender || 'Any / None';
      const chosenRatio = aspectRatio || '3:4';

      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'This tool is currently in high demand, please try again.' },
          { status: 503 }
        );
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = `You are an elite AI Art Director and Prompt Engineer specializing in Midjourney v6.1, Flux.1, ChatGPT/DALL-E 3, and Imagen 3.
The user will provide a simple idea or a few words. Your mission is to expand this into an exceptionally detailed, hyper-photorealistic masterpiece prompt according to the user's selected parameters.
DO NOT provide a short, generic description or summary. Every detail must be meticulously described using professional photographic, cinematic, and art direction terminology.

PARAMETERS:
- User Idea: "${userIdea}"
- Lighting Style: "${chosenLighting}"
- Color Grading Style: "${chosenColor}"
- Subject Gender: "${chosenGender}"
- Target Aspect Ratio: "${chosenRatio}"
- Additional Constraints: "${customInstructions || 'None'}"

CRITICAL REQUIREMENTS:
1. "promptText": Must be a masterfully written, highly comprehensive 120-250 word detailed production prompt that vividly brings the user's idea to life. Incorporate precise photographic camera optics (e.g. Hasselblad H6D-100c, Leica M11, Sony A7R V, 85mm f/1.4 prime lens, shutter speed, aperture, ISO), intricate environmental textures, atmospheric depth, lighting direction and intensity, color harmony, and finish with midjourney parameter flags: --ar ${chosenRatio} --style raw --v 6.1.
2. "negativePrompt": Specific comprehensive negative keywords to prevent bad anatomy, oversaturation, blur, watermark, CGI look, etc.
3. "camera": Recommended real camera body and lens specification.
4. "lighting": Detailed technical lighting breakdown.
5. "colorPalette": Comprehensive color palette description.
6. "composition": Advanced composition technique used.
7. "title": Catchy, short 3-6 word title.

OUTPUT MUST BE VALID JSON ONLY matching this schema:
{
  "title": "string",
  "promptText": "string",
  "negativePrompt": "string",
  "aspectRatio": "${chosenRatio}",
  "camera": "string",
  "lighting": "string",
  "colorPalette": "string",
  "composition": "string",
  "tags": ["string", "string", "string"]
}`;

        const { response, modelUsed } = await generateWithModel(ai, undefined, {
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        });

        const rawText = response.text || '';
        let parsed: any;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            throw new Error('Could not parse JSON response from Gemini');
          }
        }

        const normalizedData = {
          title: parsed.title || userIdea,
          promptText: parsed.promptText || parsed.prompt || '',
          negativePrompt: parsed.negativePrompt || parsed.negative_prompt || '',
          aspectRatio: parsed.aspectRatio || chosenRatio,
          camera: parsed.camera || '85mm f/1.4 lens, full frame sensor',
          lighting: parsed.lighting || chosenLighting,
          colorPalette: parsed.colorPalette || chosenColor,
          composition: parsed.composition || 'Cinematic composition',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [chosenLighting, chosenColor, 'AI Master Prompt'],
        };

        return NextResponse.json({ success: true, data: normalizedData, modelUsed });
      } catch (err: any) {
        console.warn('Gemini idea prompt failed:', err?.message || err);
        return NextResponse.json(
          { success: false, error: 'This tool is currently in high demand, please try again.' },
          { status: 503 }
        );
      }
    }

    // =========================================================================
    // ACTION 1: IMAGE TO PROMPT (Reverse-engineering from image)
    // =========================================================================
    if (action === 'image_to_prompt') {
      if (!image) {
        return NextResponse.json({ success: false, error: 'Image data is required' }, { status: 400 });
      }

      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'This tool is currently in high demand, please try again.' },
          { status: 503 }
        );
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
        return NextResponse.json(
          { success: false, error: 'Invalid or unsupported image format. Please upload a clear photo.' },
          { status: 400 }
        );
      }

      const promptInstruction = `Inspect this uploaded reference image with extreme technical and artistic precision.
Follow the ANALYSIS PIPELINE and reconstruct the exact AI prompt that would reproduce this image in an AI image generator.
${customInstructions ? `CRITICAL USER CUSTOM INSTRUCTIONS & CONSTRAINTS:
"${customInstructions}"
You MUST strictly obey these custom instructions (e.g. if the user requests removing watermarks, maintaining a minimum length such as 250 words minimum, removing text, adding specific objects, or adjusting lighting/mood). Incorporate them directly into the reconstructed prompt.` : styleFocus ? `User requested aesthetic/style: "${styleFocus}". Remember the uploaded image is the PRIMARY SOURCE OF TRUTH.` : ''}
Return the final response strictly conforming to the required JSON schema.`;

      const jsonSchemaConfig = {
        systemInstruction: IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
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
        
        const rawPrompt = parsed.prompt || parsed.promptText || '';
        const finalPrompt = ensureAspectRatio34(rawPrompt);

        // Normalize fields so all UI bindings and new schemas work seamlessly
        const normalizedData = {
          ...parsed,
          prompt: finalPrompt,
          promptText: finalPrompt,
          negativePrompt: parsed.negative_prompt || parsed.negativePrompt || '',
          aspectRatio: '3:4',
          aspect_ratio: '3:4',
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
        console.warn('Gemini vision failed:', err?.message || err);
        return NextResponse.json(
          { success: false, error: 'This tool is currently in high demand, please try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Studio Tools Error:', error);
    return NextResponse.json(
      { success: false, error: 'This tool is currently in high demand, please try again.' },
      { status: 503 }
    );
  }
}

