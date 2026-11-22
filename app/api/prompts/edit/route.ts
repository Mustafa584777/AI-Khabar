import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { runGeminiWithFastFallback } from '@/lib/gemini-runner';

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
      { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
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
Return ONLY valid JSON matching the schema.`;

    const contents = `Original Prompt:\n${promptText}\n\nWhat You Want To Change / Edit Instructions:\n${changeInstructions}`;

    const { parsedJson, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
      apiKey,
      expectJson: true,
      maxTotalMs: 13500,
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: { type: Type.STRING },
            negativePrompt: { type: Type.STRING },
            improvementsMade: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            parameters: {
              type: Type.OBJECT,
              properties: {
                aspectRatio: { type: Type.STRING },
                camera: { type: Type.STRING },
                lighting: { type: Type.STRING },
              },
            },
          },
          required: ['enhancedPrompt', 'negativePrompt', 'improvementsMade'],
        },
      },
    });

    const parsed = parsedJson || {};
    return NextResponse.json({
      success: true,
      enhancedPrompt: parsed.enhancedPrompt || parsed.prompt || promptText,
      negativePrompt: parsed.negativePrompt || parsed.negative_prompt || 'blurry, low quality, distorted, bad anatomy',
      improvementsMade:
        Array.isArray(parsed.improvementsMade) && parsed.improvementsMade.length > 0
          ? parsed.improvementsMade
          : [`Applied change: ${changeInstructions}`, 'Enhanced photographic styling and composition'],
      parameters: parsed.parameters || { aspectRatio: '16:9', lighting: 'Cinematic Lighting' },
      modelUsed,
      elapsedMs,
    });
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
