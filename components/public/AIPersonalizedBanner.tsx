'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, Copy, Check, Loader2, X } from 'lucide-react';
import { PersonalizationEngine } from '@/lib/personalization';

export const AIPersonalizedBanner = () => {
  const { copyPromptToClipboard } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quickIdea, setQuickIdea] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<{
    title: string;
    promptText: string;
    aiTool: string;
    category: string;
    matchReason: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePromptBox = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickIdea.trim()) return;

    setIsGenerating(true);
    setGeneratedPrompt(null);
    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'text_to_prompt',
          idea: quickIdea,
          lighting: 'Cinematic Golden Hour',
          colorGrading: 'Teal and Orange Cinematic',
          gender: 'Any / Neutral',
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedPrompt({
          title: data.data.title || quickIdea,
          promptText: data.data.promptText || data.data.prompt,
          aiTool: 'Gemini AI Studio',
          category: 'Prompt Generator',
          matchReason: `Crafted from idea: "${quickIdea}" with cinematic lighting & grading`,
        });
      }
    } catch (e) {
      console.error('Failed to generate prompt from box:', e);
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 text-white p-5 sm:p-6 shadow-xl border border-neutral-800">
        {/* Subtle glowing badge in background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#E60023]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E60023] to-[#ff4763] flex items-center justify-center text-white shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#ff5c75]">
                  Gemini AI Prompt Generator
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-0.5">
                Type your idea in a few words below and let Gemini craft a pro detailed AI photo prompt instantly.
              </p>
            </div>
          </div>

          {/* Gemini-like Prompt Generator Input Box */}
          <form onSubmit={handleGeneratePromptBox} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickIdea}
                onChange={(e) => setQuickIdea(e.target.value)}
                placeholder="e.g. Cyberpunk samurai walking in Tokyo rain at night..."
                className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-neutral-800/90 dark:bg-neutral-900 border border-neutral-700/80 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] shadow-inner"
              />
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !quickIdea.trim()}
              className="px-6 py-3.5 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#E60023]/25 flex items-center justify-center gap-2 disabled:opacity-50 transform active:scale-95 shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Crafting Prompt...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate with AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Generated Prompt Card */}
        {generatedPrompt && (
          <div className="relative mt-5 pt-4 border-t border-white/10 animate-scale-in">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#E60023] text-white text-[10px] font-black uppercase">
                    {generatedPrompt.aiTool}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {generatedPrompt.title}
                  </span>
                </div>
                <button
                  onClick={() => setGeneratedPrompt(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-200 font-mono bg-black/40 p-3 rounded-xl select-all border border-white/5 mb-3 leading-relaxed">
                {generatedPrompt.promptText}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[11px] text-[#ff8093] font-medium italic">
                  ✦ {generatedPrompt.matchReason}
                </span>

                <button
                  onClick={() => handleCopy(generatedPrompt.promptText)}
                  className="px-4 py-1.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
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

