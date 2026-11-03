import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro',
];

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
    return NextResponse.json(
      { success: false, error: 'This tool is currently in high demand, please try again.' },
      { status: 503 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a world-class prompt engineer and AI art director specializing in Midjourney v6.1, Flux.1, and DALL-E 3.
The user has provided:
1. "Original Prompt": The base prompt (which may be very detailed and long, up to 1000+ words).
2. "Change Instructions": What the user wants to add, remove, or modify.

YOUR TASK:
Surgically edit and update the original prompt precisely according to the user's change instructions.
- STRICT PRESERVATION RULE: If the original prompt is long and detailed (e.g., 500-1000+ words), you MUST preserve 100% of the original prompt's length, descriptive paragraphs, technical specifications, and formatting. Do NOT summarize, compress, or shorten the prompt. ONLY replace or modify the exact name, number, or phrase requested by the user, leaving every other paragraph and detail completely intact.
- Seamlessly integrate all requested changes while retaining all existing rich details.
- Include appropriate parameter flags at the end (e.g. --ar 16:9 --style raw --v 6.1 --s 250).

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "enhancedPrompt": "The full length revised and upgraded prompt string",
  "negativePrompt": "Comma-separated negative keywords to avoid flaws",
  "improvementsMade": [
    "Specific change 1 applied",
    "Specific change 2 applied",
    "Preserved original prompt length and detailed specifications"
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
            temperature: 0.3,
            maxOutputTokens: 8192,
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
    console.warn('Gemini prompt edit error:', err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: 'This tool is currently in high demand, please try again.',
      },
      { status: 503 }
    );
  }
}
