'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, Copy, Check, Loader2, X, Send } from 'lucide-react';

export const AIPersonalizedBanner = () => {
  const { copyPromptToClipboard } = useApp();
  const [promptIdea, setPromptIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<{
    title: string;
    promptText: string;
    summary?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptIdea.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'text_to_prompt',
          idea: promptIdea,
          lighting: 'Cinematic Golden Hour',
          colorGrading: 'Teal & Orange Cinematic',
          gender: 'Neutral / Unspecified',
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedPrompt({
          title: data.data.title || promptIdea,
          promptText: data.data.promptText || data.data.prompt || '',
          summary: data.data.summary,
        });
      }
    } catch (e) {
      console.error('Failed to generate prompt via Gemini box:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    copyPromptToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 text-white p-5 sm:p-6 shadow-xl border border-neutral-800">
        {/* Subtle glowing badge in background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#E60023]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#E60023] to-[#ff4763] flex items-center justify-center text-white shadow-md shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#ff5c75]">
                  Gemini AI Prompt Generator Box
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 font-medium">
                Type any idea or keywords below to generate a professional, detailed AI photo prompt instantly.
              </p>
            </div>
          </div>

          {/* Gemini-like Prompt Input Box */}
          <form onSubmit={handleGeneratePrompt} className="relative flex items-center">
            <input
              type="text"
              value={promptIdea}
              onChange={(e) => setPromptIdea(e.target.value)}
              placeholder="Ask Gemini to generate a detailed prompt (e.g. Cyberpunk samurai in neon rain)..."
              className="w-full pl-4 pr-32 py-3.5 bg-neutral-800/90 dark:bg-neutral-950/90 border border-neutral-700 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] shadow-inner transition-all"
              id="gemini-homepage-prompt-input"
            />
            <button
              type="submit"
              disabled={isGenerating || !promptIdea.trim()}
              className="absolute right-2 px-4 py-2 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 transform active:scale-95"
              id="gemini-homepage-generate-btn"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Generated Prompt Card */}
        {generatedPrompt && (
          <div className="relative mt-5 pt-4 border-t border-white/10 animate-scale-in">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase">
                    Gemini Pro Prompt
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-xs">
                    {generatedPrompt.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratedPrompt(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {generatedPrompt.summary && (
                <p className="text-xs text-neutral-300 italic">
                  ✦ {generatedPrompt.summary}
                </p>
              )}

              <p className="text-xs text-neutral-200 font-mono bg-black/50 p-3.5 rounded-xl select-all border border-white/5 leading-relaxed">
                {generatedPrompt.promptText}
              </p>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy(generatedPrompt.promptText)}
                  className="px-4 py-2 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>1-Click Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

