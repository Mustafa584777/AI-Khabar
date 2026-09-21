import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro',
];

// High-fidelity prompt rewriter when AI API is unavailable or rate-limited
function generateLocalPromptEdit(promptText: string, changeInstructions: string) {
  const cleanOriginal = promptText.trim().replace(/--[a-zA-Z0-9\s.:-]+$/g, '').trim();
  const cleanChanges = changeInstructions.trim();

  // Detect aspect ratio from original prompt if present, else default to 16:9
  let detectedRatio = '16:9';
  const arMatch = promptText.match(/--ar\s+([0-9:]+)/i);
  if (arMatch && arMatch[1]) {
    detectedRatio = arMatch[1];
  }

  // Detect lighting or camera styling keywords
  let lightingSetup = 'Cinematic volumetric key lighting with soft fill and delicate highlights';
  const lowerChanges = cleanChanges.toLowerCase();
  if (lowerChanges.includes('sun') || lowerChanges.includes('day') || lowerChanges.includes('golden')) {
    lightingSetup = 'Golden hour sunlight with warm amber rim lighting and natural shadows';
  } else if (lowerChanges.includes('neon') || lowerChanges.includes('cyber') || lowerChanges.includes('night')) {
    lightingSetup = 'Moody neon ambient lighting, cyan and magenta accent glow, wet asphalt reflections';
  } else if (lowerChanges.includes('studio') || lowerChanges.includes('portrait')) {
    lightingSetup = 'Softbox studio portrait lighting with 3-point illumination and catchlights';
  } else if (lowerChanges.includes('dark') || lowerChanges.includes('dramatic')) {
    lightingSetup = 'Rembrandt dramatic chiaroscuro lighting with deep shadows and high contrast';
  }

  // Reconstruct modified prompt seamlessly
  const enhancedPrompt = `${cleanOriginal}, modified with: ${cleanChanges}. Masterfully composed, captured with Hasselblad H6D-100c and 85mm f/1.4 lens, ${lightingSetup}, authentic micro-textures, photorealistic rendering, 8K ultra high resolution, award-winning art direction --ar ${detectedRatio} --style raw --v 6.1 --s 250`;

  return {
    enhancedPrompt,
    negativePrompt: 'blurry, low quality, distorted anatomy, extra fingers, cartoonish, oversaturated, watermark, bad lighting, grainy artifacts, amateur photography',
    improvementsMade: [
      `Incorporated requested changes: "${cleanChanges}"`,
      'Enhanced with Hasselblad H6D-100c 85mm f/1.4 camera optics and depth of field',
      `Applied ${lightingSetup}`,
      `Calibrated Midjourney v6.1 production parameters (--ar ${detectedRatio} --style raw)`,
    ],
    parameters: {
      aspectRatio: detectedRatio,
      camera: 'Hasselblad H6D-100c, 85mm f/1.4 lens',
      lighting: lightingSetup,
      renderEngine: 'Photorealistic Raw Engine',
    },
  };
}

export async function POST(req: NextRequest) {
  let promptText = '';
  let changeInstructions = '';

  try {
    const body = await req.json();
    promptText = typeof body?.promptText === 'string' ? body.promptText.trim() : '';
    changeInstructions = typeof body?.changeInstructions === 'string' ? body.changeInstructions.trim() : '';
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!promptText) {
    return NextResponse.json({ success: false, error: 'Original prompt text is required' }, { status: 400 });
  }
  if (!changeInstructions) {
    return NextResponse.json({ success: false, error: 'Please specify what you want to change in the prompt' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const localResult = generateLocalPromptEdit(promptText, changeInstructions);
    return NextResponse.json({
      success: true,
      ...localResult,
      fallback: true,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a world-class prompt engineer and AI art director specializing in Midjourney v6.1, Flux.1, and DALL-E 3.
The user has provided:
1. "Original Prompt": The base prompt.
2. "Change Instructions": What the user wants to add, remove, or modify.

YOUR TASK:
Rewrite and edit the original prompt precisely according to the user's change instructions.
- Seamlessly integrate all requested changes while preserving the core visual beauty.
- Elevate the prompt with professional photographic and cinematic terminology (camera lens body, lighting dynamics, texture details, compositional rules).
- Include appropriate parameter flags at the end (e.g. --ar 16:9 --style raw --v 6.1 --s 250).
- Produce a detailed, ready-to-run 100-200 word prompt string.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "enhancedPrompt": "The full revised and upgraded prompt string",
  "negativePrompt": "Comma-separated negative keywords to avoid flaws",
  "improvementsMade": [
    "Specific change 1 applied",
    "Specific change 2 applied",
    "Optics or lighting enhancement applied"
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "camera": "Camera and lens details",
    "lighting": "Lighting setup details"
  }
}`;

    const contents = `Original Prompt:\n${promptText}\n\nWhat You Want To Change / Edit Instructions:\n${changeInstructions}`;

    let lastError: any = null;
    let geminiResponse: any = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        if (response && response.text) {
          geminiResponse = response;
          break;
        }
      } catch (err: any) {
        console.warn(`[Prompt Edit API] Model "${model}" failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (geminiResponse && geminiResponse.text) {
      const rawText = geminiResponse.text;
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse Gemini JSON output');
        }
      }

      return NextResponse.json({
        success: true,
        enhancedPrompt: parsed.enhancedPrompt || parsed.prompt || promptText,
        negativePrompt: parsed.negativePrompt || parsed.negative_prompt || 'blurry, low quality, distorted, bad anatomy',
        improvementsMade: Array.isArray(parsed.improvementsMade) && parsed.improvementsMade.length > 0
          ? parsed.improvementsMade
          : [`Applied change: ${changeInstructions}`, 'Enhanced photographic styling and composition'],
        parameters: parsed.parameters || { aspectRatio: '16:9', lighting: 'Cinematic Lighting' },
      });
    }

    throw lastError || new Error('All candidate models failed');
  } catch (err: any) {
    console.warn('Gemini prompt edit error, applying local engine:', err?.message || err);
    const localResult = generateLocalPromptEdit(promptText, changeInstructions);
    return NextResponse.json({
      success: true,
      ...localResult,
      fallback: true,
    });
  }
}
