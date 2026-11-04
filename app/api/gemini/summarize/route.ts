import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

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

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert AI content analyst and technical writer for an AI photography and prompt engineering platform (aitoolhindi.online).
Your task is to read the provided article/prompt details and generate a concise, engaging, professional summary (around 3 to 4 impactful sentences or bullet points) highlighting the visual aesthetics, use cases, key prompt techniques, and creative style.
Provide the response in clear, fluent Hindi (or mixed Hinglish/Hindi as appropriate for the user's audience) or professional English depending on the content. Make sure it is dynamically tailored to the specific text, NOT static.`;

    const promptContent = `Please analyze and summarize the following article/prompt in real time:
Title: ${title || 'Untitled Prompt'}
Category: ${category || 'General'}
Description / Details: ${description || 'N/A'}
Prompt / Technical Text: ${promptText || 'N/A'}

Provide a concise, high-value AI summary now.`;

    let lastError: any = null;
    let summaryResult = '';

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: promptContent,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        });

        if (response && response.text) {
          summaryResult = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`[Summarize API] Model "${model}" failed: ${err?.message || err}. Trying next...`);
        lastError = err;
      }
    }

    if (!summaryResult) {
      throw lastError || new Error('All candidate models failed to generate summary.');
    }

    return NextResponse.json({ summary: summaryResult });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate real-time AI summary.' },
      { status: 500 }
    );
  }
}
