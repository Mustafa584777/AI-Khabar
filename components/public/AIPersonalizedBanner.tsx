'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, Copy, Check, Loader2, X, Send } from 'lucide-react';

export const AIPersonalizedBanner = () => {
  const { copyPromptToClipboard } = useApp();
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<{
    title: string;
    promptText: string;
    aiTool: string;
    category: string;
    matchReason: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim()) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'idea_to_prompt',
          idea: idea.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedPrompt({
          ...data.data,
          matchReason: `Generated based on your idea: "${idea.trim()}"`
        });
      }
    } catch (e) {
      console.error('Failed to generate prompt from idea:', e);
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 text-white p-4 sm:p-5 shadow-lg border border-neutral-800">
        {/* Subtle glowing badge in background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#E60023]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#E60023]" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              AI Prompt Generator
            </span>
          </div>
          
          {/* Gemini-like Input Box */}
          <form onSubmit={handleGenerateIdea} className="relative w-full">
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your idea in a few words (e.g. 'a neon cyberpunk city at night')..."
              className="w-full bg-white/5 border border-white/10 text-white placeholder-neutral-400 text-sm rounded-full py-3.5 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-[#E60023] transition-all backdrop-blur-sm"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !idea.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-[#E60023]"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 -ml-0.5" />
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
                    {generatedPrompt.aiTool || 'Gemini'} Live Craft
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
                  className="px-4 py-1.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
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

