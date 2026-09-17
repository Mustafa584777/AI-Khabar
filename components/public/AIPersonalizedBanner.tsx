'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, Copy, Check, Loader2, X } from 'lucide-react';
import { PersonalizationEngine } from '@/lib/personalization';

export const AIPersonalizedBanner = () => {
  const { tasteProfile, copyPromptToClipboard, setCurrentView } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<{
    title: string;
    promptText: string;
    aiTool: string;
    category: string;
    matchReason: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const tasteSummary = PersonalizationEngine.getTasteSummary(tasteProfile);

  const handleGeneratePersonalizedPrompt = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'personalized_prompt_craft',
          profile: tasteSummary,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedPrompt(data.data);
      }
    } catch (e) {
      console.error('Failed to generate personalized prompt:', e);
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

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Requested Title & Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E60023] to-[#ff4763] flex items-center justify-center text-white shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#ff5c75]">
                  Requested Prompts Hub
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-0.5">
                Explore community-requested photo prompts or submit your own custom prompt request.
              </p>
            </div>
          </div>

          {/* Right: Request a Prompt Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('promptcms_dashboard_tab', 'request');
                }
                setCurrentView('user-dashboard');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all shadow-md shadow-[#E60023]/25 flex items-center justify-center gap-2 transform active:scale-95 shrink-0"
              id="request-a-prompt-btn"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Request a Prompt</span>
            </button>
          </div>
        </div>

        {/* Live Generated Prompt Card */}
        {generatedPrompt && (
          <div className="relative mt-4 pt-4 border-t border-white/10 animate-scale-in">
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

