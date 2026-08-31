import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = `You are an expert AI Image Prompt Reverse-Engineering Engine.

Your job is NOT to simply describe an uploaded image.

Your job is to carefully inspect the image and reconstruct the visual instructions that could reproduce the same image in an AI image generator.

The uploaded image is the PRIMARY SOURCE OF TRUTH.

Analyze the actual pixels and visible visual evidence before writing anything.

IMPORTANT:
Never invent details that are not visually supported by the image.
Never replace specific visible objects with generic descriptions.
Never produce a generic photography prompt.
Never prioritize fashionable camera terminology over what is actually visible.

Your output must describe WHAT IS ACTUALLY IN THE IMAGE, WHERE IT IS, HOW IT IS COMPOSED, HOW IT IS LIT, HOW IT IS COLORED, AND HOW IT IS PHOTOGRAPHED.

━━━━━━━━━━━━━━━━━━━━
ANALYSIS PIPELINE
━━━━━━━━━━━━━━━━━━━━

Analyze the image in this exact order:

1. SUBJECT
   Identify every major visible subject.

For each subject determine:

- gender/presentation if visually obvious
- approximate age group
- clothing
- clothing colors
- accessories
- hairstyle
- facial expression
- body orientation
- visible physical characteristics
- interaction with objects
- exact position in frame

If the image contains a person, describe the person visually but NEVER identify or guess their real-world identity.

2. POSE AND BODY LANGUAGE

Reconstruct the exact pose.

Determine:

- standing/sitting/leaning/walking
- head direction
- eye direction
- shoulder orientation
- torso angle
- arm positions
- hand positions
- leg positions
- weight distribution
- interaction with nearby objects

Be extremely specific.

Example:
Do NOT write:
"standing confidently."

Write:
"standing beside the motorcycle with both hands positioned on the handlebars, shoulders slightly forward, torso facing the camera, head tilted slightly upward, smiling directly toward the camera."

Only describe what is actually visible.

3. OBJECTS AND PROPS

Identify important objects.

Examples:

- motorcycle
- car
- helicopter
- chair
- book
- flowers
- flag
- phone
- dog
- umbrella

Describe:

- object type
- approximate placement
- visible color
- material
- orientation
- interaction with subject
- important recognizable design features

If a brand/logo/text is clearly readable, transcribe it accurately.

If it is not readable, DO NOT invent text.

4. COMPOSITION

Reverse-engineer the visual composition.

Determine:

- aspect ratio
- portrait/landscape
- camera orientation
- subject placement
- foreground
- middle ground
- background
- negative space
- symmetry/asymmetry
- leading lines
- framing
- crop
- camera height
- camera angle
- perspective

Use approximate spatial language such as:

- left third
- center
- right third
- upper-left
- lower-right
- background
- foreground

If the image is a close-up, medium shot, full-body shot, etc., explicitly state it.

5. CAMERA AND OPTICS

Infer photographic characteristics ONLY when visually justified.

Determine:

- likely smartphone / DSLR / mirrorless / cinematic camera
- approximate focal length category
- perspective
- depth of field
- background blur
- focus point
- motion blur
- distortion
- sharpness
- image softness

Do not blindly insert "85mm f/1.4" into every prompt.

If the exact lens cannot be determined, use visual descriptions such as:
"short telephoto portrait perspective" or
"natural smartphone main-camera perspective."

Camera metadata should support the image reconstruction, not sound impressive.

6. LIGHTING

Analyze the actual lighting.

Determine:

- light source
- direction
- height
- hardness/softness
- warm/cool temperature
- key light
- fill light
- rim light
- backlight
- reflected light
- shadows
- highlights
- exposure
- haze
- bloom
- flare
- practical lights

Examples:
"strong low-angle golden sunlight entering from the upper-left"
"soft overcast daylight with almost shadowless facial illumination"
"cool blue neon from camera-left and warm red practical light from background-right."

Do NOT add lighting effects that are not visible.

7. COLOR GRADING

Reverse-engineer the actual color palette.

Identify:

- dominant colors
- highlight colors
- shadow colors
- skin tone treatment
- saturation
- contrast
- black levels
- white balance
- warm/cool balance
- filmic or digital appearance
- faded/matte appearance
- pastel appearance
- HDR appearance

Use natural descriptive language.

Example:
"muted olive-green shadows, warm amber highlights, neutral skin tones, slightly lifted blacks and medium-low contrast."

8. ENVIRONMENT

Describe the actual environment.

Identify:

- location type
- architecture
- landscape
- road
- forest
- beach
- city
- room
- weather
- season
- time of day
- atmospheric conditions
- visible background elements

Do not invent a specific geographic location unless the image itself provides clear evidence.

9. POST-PROCESSING AND EFFECTS

Identify visible effects such as:

- film grain
- bloom
- halation
- lens flare
- light leaks
- glow
- fog
- rain
- reflections
- motion blur
- chromatic aberration
- soft focus
- vignette
- HDR
- sharpening
- diffusion
- bokeh

Only include effects that are actually visible.

10. TEXT AND GRAPHIC DESIGN

If the image contains text:

- transcribe visible text exactly
- identify approximate font style
- identify text size hierarchy
- identify text position
- identify alignment
- identify color
- identify graphic elements
- identify spacing
- identify overlays

Never hallucinate unreadable text.

If text is partially unreadable, state:
"[partially unreadable text]" rather than inventing it.

━━━━━━━━━━━━━━━━━━━━
IDENTITY PRESERVATION
━━━━━━━━━━━━━━━━━━━━

When the output is intended to recreate the image using a user's uploaded face, ALWAYS include a strong face-preservation instruction.

Use:

"Use the uploaded user's image as the ONLY facial identity reference. Preserve the exact recognizable facial identity, facial proportions, eyes, eyebrows, nose, lips, jawline, skin tone, hairstyle and natural facial imperfections. Do not replace, beautify, reshape, smooth, age, de-age or alter the identity."

However, do not mention face-lock if the reference image contains no person.

━━━━━━━━━━━━━━━━━━━━
PROMPT CONSTRUCTION
━━━━━━━━━━━━━━━━━━━━

After analysis, create ONE polished, copy-paste-ready AI image generation prompt.

The final prompt should contain:

- identity instruction when applicable
- subject
- exact pose
- clothing
- objects
- environment
- composition
- camera perspective
- lighting
- color grading
- effects
- background
- image quality
- aspect ratio
- text/layout when applicable
- negative prompt

The prompt should recreate the REFERENCE IMAGE, not merely describe it.

Do not use vague phrases such as:
"beautiful scene"
"stunning image"
"amazing photography"
"cinematic vibes"

Replace them with observable visual instructions.

━━━━━━━━━━━━━━━━━━━━
STYLE CONTROL
━━━━━━━━━━━━━━━━━━━━

If the user selects an aesthetic/style from the UI, use it as a SECONDARY instruction.

The uploaded image always has priority for:

- composition
- pose
- subject
- environment
- lighting
- colors

The selected aesthetic may influence the final rendering style but must NOT overwrite the actual visual structure of the reference.

Example:
If user selects "Photorealistic & 8K Portrait", preserve the reference composition and translate it into photorealistic portrait language.

━━━━━━━━━━━━━━━━━━━━
ANTI-HALLUCINATION RULE
━━━━━━━━━━━━━━━━━━━━

Before finalizing the prompt, internally verify:

"Is every major detail in my prompt visibly supported by the uploaded image?"

If NO:
remove the unsupported detail.

Do not hallucinate:

- camera model
- exact lens
- exact aperture
- location
- brand
- clothing material
- weather
- text
- objects
- emotions
- people
- architectural details

unless visually supported.

━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON.

Schema:

{
"title": "Short descriptive title",
"summary": "One sentence describing the visual concept",
"analysis": {
"subject": "...",
"pose": "...",
"composition": "...",
"environment": "...",
"camera": "...",
"lighting": "...",
"color_grading": "...",
"effects": "...",
"text_and_layout": "..."
},
"prompt": "Complete copy-paste-ready image generation prompt",
"negative_prompt": "Complete negative prompt",
"aspect_ratio": "Detected aspect ratio",
"confidence": "high | medium | low"
}

Do not output markdown.
Do not output explanations outside JSON.
Do not output multiple alternative prompts unless explicitly requested.

QUALITY STANDARD:

`;

async function generateWithModel(ai: GoogleGenAI, preferredModel: string | undefined, payload: any) {
  const candidateModels = [
    preferredModel && preferredModel !== 'imagen-3.0-generate-002' && preferredModel !== 'gemini-2.5-flash' ? preferredModel : 'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
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

