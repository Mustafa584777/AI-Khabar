'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  LogIn,
  Zap,
  Camera,
  SunMedium,
  Layers,
  Ratio,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16', desc: 'Reels / Shorts', iconClass: 'h-4 w-2.5' },
  { id: '3:4', label: '3:4', desc: 'Pinterest', iconClass: 'h-3.5 w-2.5' },
  { id: '1:1', label: '1:1', desc: 'Square', iconClass: 'h-3 w-3' },
  { id: '4:5', label: '4:5', desc: 'Portrait', iconClass: 'h-3.5 w-3' },
  { id: '16:9', label: '16:9', desc: 'Cinematic', iconClass: 'h-2.5 w-4' },
];

const INSPIRATION_CHIPS = [
  'Cyberpunk Neon Rain Portrait',
  '90s Vintage 35mm Film Aesthetic',
  'Golden Hour Minimalist Cafe',
  'Dark Fantasy Forest Queen',
  'Futuristic Supercar in Tokyo',
  'Macro Dewdrop on Velvet Rose',
];

export const HomepageGeminiGenerator: React.FC = () => {
  const {
    userAccount,
    openAuthModal,
    toolCredits,
    deductToolCredit,
    saveAiHistoryItem,
    showToast,
    copyPromptToClipboard,
  } = useApp();

  const router = useRouter();

  const [idea, setIdea] = useState('');
  const [selectedRatio, setSelectedRatio] = useState('9:16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    promptText: string;
    negativePrompt?: string;
    aspectRatio: string;
    camera?: string;
    lighting?: string;
    tags?: string[];
  } | null>(null);

  const isLoggedIn = Boolean(userAccount && userAccount.isLoggedIn);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Authentication Check
    if (!isLoggedIn) {
      openAuthModal('Please sign in to generate prompts with Gemini AI.');
      return;
    }

    // 2. Credits Check
    if (toolCredits <= 0) {
      showToast('You have used all your credits for today. Credits refill daily!');
      return;
    }

    const topic = idea.trim() || 'Cinematic aesthetic portrait';
    setIsGenerating(true);

    // 3. Deduct 1 Tool Credit
    const creditDeducted = deductToolCredit();
    if (!creditDeducted) {
      showToast('Insufficient credits to generate prompt.');
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'homepage_prompt_generator',
          topic,
          aspectRatio: selectedRatio,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setGeneratedResult(json.data);
        showToast('Generated 1 photographic prompt with Gemini AI (-1 Credit)');

        // Save to user's AI Studio History
        saveAiHistoryItem({
          id: `gen-${Date.now()}`,
          type: 'prompt_to_image',
          title: json.data.title || topic,
          promptText: json.data.promptText,
          negativePrompt: json.data.negativePrompt,
          aspectRatio: json.data.aspectRatio || selectedRatio,
          camera: json.data.camera,
          lighting: json.data.lighting,
          tags: json.data.tags,
          createdAt: Date.now(),
        });
      } else {
        showToast(json.error || 'Failed to generate prompt. Please try again.');
      }
    } catch (err: any) {
      console.error('Error generating prompt:', err);
      showToast('Network error while generating prompt.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = (text: string) => {
    copyPromptToClipboard(text);
    setCopied(true);
    showToast('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenInCreateStudio = () => {
    if (!generatedResult) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auraprompt_studio_preload', generatedResult.promptText);
      sessionStorage.setItem('promptcms_studio_preload', generatedResult.promptText);
    }
    router.push('/create');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8" id="homepage-gemini-generator">
      <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xl transition-all">
        {/* Subtle Decorative Ambient Background Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#E60023]/8 dark:bg-[#E60023]/12 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/8 dark:bg-blue-500/12 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          {/* Top Header: Badge, Title & Credits */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#E60023] via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#E60023]">
                    Gemini AI Engine
                  </span>
                  <span className="inline-block w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    Midjourney v6.1 & Flux Calibrated
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Gemini Prompt Generator
                </h2>
              </div>
            </div>

            {/* Right: Credits Badge & Auth State */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {isLoggedIn ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{toolCredits} Credits Remaining</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('Sign in to use the Gemini Prompt Generator with free daily credits.')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#E60023]" />
                  <span>Sign In for 2 Free Credits</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleGenerate} className="mt-5 space-y-4">
            {/* Input Row: Idea + Aspect Ratio + Generate Button */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Concept / Idea Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your photo idea (e.g. Cyberpunk samurai in neon rain, 90s vintage film portrait...)"
                  className="w-full px-4 sm:px-5 py-3.5 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#E60023]/60 focus:bg-white dark:focus:bg-neutral-800 transition-all shadow-inner"
                />
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="px-6 py-3.5 rounded-2xl bg-[#E60023] hover:bg-[#c7001e] text-white font-bold text-sm sm:text-base shadow-lg shadow-red-500/25 transition-all transform active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Engineering Prompt...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Prompt</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black/25">
                      1 Credit
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Focused Aspect Ratio Selection Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mr-1">
                  <Ratio className="w-3.5 h-3.5 text-[#E60023]" />
                  <span>Aspect Ratio:</span>
                </span>
                {ASPECT_RATIOS.map((ratio) => {
                  const isSelected = selectedRatio === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setSelectedRatio(ratio.id)}
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-102'
                          : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <span
                        className={`inline-block rounded-xs border transition-colors ${ratio.iconClass} ${
                          isSelected
                            ? 'border-white bg-white/30 dark:border-neutral-900 dark:bg-neutral-900/30'
                            : 'border-neutral-400 dark:border-neutral-500'
                        }`}
                      />
                      <span>{ratio.label}</span>
                      <span className={`text-[10px] hidden sm:inline opacity-70`}>
                        ({ratio.desc})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Notice for non-logged-in users */}
              {!isLoggedIn && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <span>Sign in required to save and use free credits.</span>
                </p>
              )}
            </div>

            {/* Quick Inspiration Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 mr-1">
                Try:
              </span>
              {INSPIRATION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setIdea(chip)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </form>

          {/* Generated Result Presentation Card */}
          {generatedResult && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 animate-fade-in transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E60023] animate-pulse" />
                  <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white">
                    {generatedResult.title || 'Master Photo Prompt'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold">
                    --ar {generatedResult.aspectRatio}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(generatedResult.promptText)}
                    className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenInCreateStudio}
                    className="px-3.5 py-1.5 rounded-full bg-[#E60023] hover:bg-[#c7001e] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span>Open in Studio</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Master Prompt Text Box */}
              <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs sm:text-sm font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed select-all">
                {generatedResult.promptText}
              </div>

              {/* Parameters Breakdown */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {generatedResult.camera && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300">
                    <Camera className="w-4 h-4 text-[#E60023] shrink-0" />
                    <span className="truncate">{generatedResult.camera}</span>
                  </div>
                )}
                {generatedResult.lighting && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300">
                    <SunMedium className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">{generatedResult.lighting}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
