import { NextRequest, NextResponse } from 'next/server';
import { runGeminiWithFastFallback } from '@/lib/gemini-runner';

export async function POST(req: NextRequest) {
  try {
    const { title, description, promptText, category } = await req.json();

    if (!title && !promptText) {
      return NextResponse.json(
        { error: 'Article title or prompt content is required for summarization.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const systemInstruction = `You are an expert AI content analyst and technical writer for an AI photography and prompt engineering platform.
Your task is to read the provided article/prompt details and generate a concise, engaging, professional summary (around 3 to 4 impactful sentences or bullet points) highlighting the visual aesthetics, use cases, key prompt techniques, and creative style.
Provide the response in clear, fluent language tailored to the specific text, NOT static.`;

    const promptContent = `Please analyze and summarize the following article/prompt in real time:
Title: ${title || 'Untitled Prompt'}
Category: ${category || 'General'}
Description / Details: ${description || 'N/A'}
Prompt / Technical Text: ${promptText || 'N/A'}

Provide a concise, high-value AI summary now.`;

    const { text, modelUsed, elapsedMs } = await runGeminiWithFastFallback({
      apiKey,
      expectJson: false,
      maxTotalMs: 12000,
      contents: promptContent,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    return NextResponse.json({ summary: text, modelUsed, elapsedMs });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate real-time AI summary.' },
      { status: 503 }
    );
  }
}
