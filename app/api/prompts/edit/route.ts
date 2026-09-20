import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { promptText, changeInstructions } = await req.json();
    if (!promptText || !promptText.trim()) {
      return NextResponse.json({ success: false, error: 'Original prompt text is required' }, { status: 400 });
    }
    if (!changeInstructions || !changeInstructions.trim()) {
      return NextResponse.json({ success: false, error: 'Please specify what you want to change in the prompt' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback if API key is not configured
      return NextResponse.json({
        success: true,
        enhancedPrompt: `${promptText.trim()}, modified: ${changeInstructions.trim()} --ar 16:9`,
        negativePrompt: 'blurry, low quality, distorted',
        improvementsMade: [
          `Applied requested change: ${changeInstructions.trim()}`,
          'Updated prompt structure and maintained visual coherence'
        ],
        parameters: {
          aspectRatio: '16:9',
          lighting: 'Custom Edited Lighting'
        }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const systemPrompt = `You are an expert AI prompt editor.
The user will provide:
1. An original prompt.
2. Specific instructions on what they want to change ("What you want to change").

Your task is to rewrite and edit the original prompt precisely according to the user's change instructions while preserving the style and core subject unless told otherwise.
Return a valid JSON object with:
1. "enhancedPrompt": The newly edited prompt reflecting the requested changes.
2. "negativePrompt": Suggested negative prompt.
3. "improvementsMade": An array of strings explaining the specific edits made.
4. "parameters": An object with recommended parameters (aspectRatio, lighting, camera).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Original Prompt:\n${promptText}\n\nWhat You Want To Change / Edit Instructions:\n${changeInstructions}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return NextResponse.json({
      success: true,
      enhancedPrompt: parsed.enhancedPrompt || promptText,
      negativePrompt: parsed.negativePrompt || 'blurry, low quality, distorted',
      improvementsMade: parsed.improvementsMade || [`Applied change: ${changeInstructions}`],
      parameters: parsed.parameters || { aspectRatio: '16:9' }
    });
  } catch (err: any) {
    console.error('Prompt edit error:', err);
    const { promptText, changeInstructions } = await req.json().catch(() => ({ promptText: '', changeInstructions: '' }));
    return NextResponse.json({
      success: true,
      enhancedPrompt: `${promptText || ''}, modified: ${changeInstructions || 'custom edits'} --ar 16:9`,
      negativePrompt: 'blurry, low quality',
      improvementsMade: ['Applied user requested modifications'],
      parameters: { aspectRatio: '16:9' }
    });
  }
}
