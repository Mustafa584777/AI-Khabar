'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Sliders,
  ChevronDown,
  Wand2,
  Lock,
  Zap,
} from 'lucide-react';

const LIGHTING_OPTIONS = [
  'Cinematic Golden Hour',
  'Volumetric Fog & Neon',
  'Softbox Studio Portrait',
  'Dramatic Rembrandt Chiaroscuro',
  'Harsh Direct Sunlight',
  'Moody Low-Key Noir',
  'Ethereal Sunset Backlight',
];

const COLOR_OPTIONS = [
  'Cinematic Teal & Orange',
  'Vibrant Kodachrome 64',
  'Moody Desaturated 35mm',
  'Pastel Film Glow',
  'Monochrome High-Contrast Noir',
  'Cyberpunk Neon Palette',
  'Warm Golden Hour Tone',
];

const GENDER_OPTIONS = [
  'Any / None',
  'Female',
  'Male',
  'Non-Binary',
  'Couple',
];

const QUICK_IDEAS = [
  'Cyberpunk samurai in rainy neon Tokyo',
  'Vintage 35mm portrait in cozy Paris café',
  'Futuristic astronaut exploring glowing crystal cave',
  'High-fashion streetwear model in brutalist architecture',
  'Cinematic warrior queen with golden armor at sunset',
];

export const GeminiPromptBox = () => {
  const router = useRouter();
  const { showToast, userAccount, openAuthModal, deductToolCredit, toolCredits } = useApp();

  const [idea, setIdea] = useState('');
  const [lighting, setLighting] = useState('Cinematic Golden Hour');
  const [colorGrading, setColorGrading] = useState('Cinematic Teal & Orange');
  const [gender, setGender] = useState('Any / None');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [showOptions, setShowOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    promptText: string;
    negativePrompt?: string;
    camera?: string;
    lighting?: string;
    colorPalette?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanIdea = idea.trim();
    if (!cleanIdea) {
      showToast('Please enter an idea in 1 line or a few words.');
      return;
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Login is required to use the Gemini Prompt Generator tool. Each prompt generation consumes 1 credit.');
      return;
    }

    if (toolCredits < 1) {
      showToast('You need at least 1 credit to generate prompts. Your daily free credits reset every 24 hours.');
      return;
    }

    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'idea_to_prompt',
          idea: cleanIdea,
          lighting,
          colorGrading,
          gender,
          aspectRatio,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        deductToolCredit(1);
        setGeneratedResult(json.data);
        showToast('Detailed prompt generated with Gemini! (1 credit consumed)');
      } else {
        showToast(json.error || 'Could not generate prompt. Please try again.');
      }
    } catch (err) {
      console.error('Gemini prompt generation error:', err);
      showToast('Failed to generate prompt. Please check connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult?.promptText) return;
    navigator.clipboard.writeText(generatedResult.promptText);
    setCopied(true);
    showToast('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInCreate = () => {
    if (!generatedResult?.promptText) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', generatedResult.promptText);
      sessionStorage.setItem('auraprompt_studio_preload', generatedResult.promptText);
    }
    router.push('/create');
    showToast('Loaded into Create Studio!');
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6 px-4 sm:px-0 text-left" id="gemini-prompt-generator-box">
      {/* Container with subtle Gemini-inspired gradient ring */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 p-4 sm:p-6 border border-neutral-200/90 dark:border-neutral-800 shadow-xl shadow-neutral-200/40 dark:shadow-black/50 transition-all">
        {/* Header with Gemini Sparkle styling and Credits indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-red-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 dark:from-blue-400 dark:via-purple-300 dark:to-red-400 bg-clip-text text-transparent">
                  Gemini Prompt Generator
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  1 Line → Detailed Master Prompt
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Login & Credit Indicator Badge */}
            {userAccount?.isLoggedIn ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold text-amber-700 dark:text-amber-300"
                title="Consumes 1 credit per generation"
              >
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{toolCredits} {toolCredits === 1 ? 'Credit' : 'Credits'}</span>
                <span className="text-[10px] opacity-75 font-normal">(1 / result)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('Login is required to use the Gemini Prompt Generator tool. Each prompt generation consumes 1 credit.')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                title="Sign in required"
              >
                <Lock className="w-3 h-3" />
                <span>Login Required (1 Credit / Result)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-neutral-500" />
              <span className="hidden sm:inline">Settings</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-3">
          {/* Main Idea Input Box */}
          <div className="relative">
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Enter your photo prompt idea in 1 line (e.g. Cyberpunk samurai in rainy neon Tokyo)..."
              className="w-full pl-4 pr-28 sm:pr-36 py-3.5 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 transition-all"
              id="gemini-idea-input"
            />
            <button
              type="submit"
              disabled={isGenerating || !idea.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="gemini-generate-btn"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Expanding...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Idea Inspiration Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            <span className="text-neutral-400 dark:text-neutral-500 font-semibold shrink-0">Try:</span>
            {QUICK_IDEAS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setIdea(sample)}
                className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium shrink-0 transition-colors cursor-pointer truncate max-w-[220px]"
              >
                {sample}
              </button>
            ))}
          </div>

          {/* Collapsible Dropdown Controls for Lighting, Colour Grading, Gender & Aspect Ratio */}
          {showOptions && (
            <div className="pt-3 border-t border-neutral-200/80 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 animate-fade-in text-left">
              {/* Lighting Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                  Lighting
                </label>
                <select
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LIGHTING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Colour Grading Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                  Colour Grading
                </label>
                <select
                  value={colorGrading}
                  onChange={(e) => setColorGrading(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COLOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Story / Reel</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="4:3">4:3 Classic</option>
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Generated Prompt Results Box */}
        {generatedResult && (
          <div className="mt-4 pt-4 border-t border-neutral-200/80 dark:border-neutral-800 space-y-3 animate-fade-in text-left">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                  {generatedResult.title || 'Detailed AI Prompt'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900'
                  }`}
                  id="gemini-copy-result-btn"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenInCreate}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <span>Open in Studio</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Prompt Text Box */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 text-neutral-100 font-mono text-xs leading-relaxed border border-neutral-800 shadow-inner">
              <p className="whitespace-pre-wrap select-all selection:bg-blue-600 selection:text-white">
                {generatedResult.promptText}
              </p>
            </div>

            {/* Micro Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
              {generatedResult.camera && (
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                  📸 {generatedResult.camera}
                </span>
              )}
              {generatedResult.lighting && (
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                  💡 {generatedResult.lighting}
                </span>
              )}
              {generatedResult.colorPalette && (
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                  🎨 {generatedResult.colorPalette}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
