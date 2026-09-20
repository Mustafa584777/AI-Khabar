'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Wand2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const PromptEditorTool = () => {
  const router = useRouter();
  const { showToast, saveAiHistoryItem } = useApp();

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [enhancementGoal, setEnhancementGoal] = useState<string>('Make Cinematic & Photorealistic');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    enhancedPrompt: string;
    negativePrompt: string;
    improvementsMade: string[];
    parameters: Record<string, string>;
  } | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState<boolean>(false);
  const [copiedEnhanced, setCopiedEnhanced] = useState<boolean>(false);

  const samplePrompts = [
    'A cyberpunk street in Tokyo with neon signs and rain puddles',
    'Portrait of a young woman in vintage clothing with golden hour sunlight',
    'Futuristic sports car driving through a mountain highway at sunset',
    'Cozy wooden cabin in snowy mountains with warm glowing windows'
  ];

  const handleEditPrompt = async () => {
    if (!inputPrompt.trim()) {
      showToast('Please paste or type a prompt to edit.', 'error');
      return;
    }

    setIsEditing(true);
    try {
      const res = await fetch('/api/prompts/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: inputPrompt, enhancementGoal }),
      });
      const data = await res.json();
      if (data.success) {
        setResultData({
          enhancedPrompt: data.enhancedPrompt,
          negativePrompt: data.negativePrompt,
          improvementsMade: data.improvementsMade || [],
          parameters: data.parameters || {},
        });
        showToast('Prompt successfully edited and enhanced by AI!', 'success');

        saveAiHistoryItem?.({
          id: 'prompt_edit_' + Date.now(),
          type: 'idea_to_prompt',
          title: 'AI Enhanced Prompt',
          promptText: data.enhancedPrompt,
          negativePrompt: data.negativePrompt,
          camera: data.parameters?.camera,
          lighting: data.parameters?.lighting,
          aspectRatio: data.parameters?.aspectRatio || '16:9',
          tags: ['Prompt Editor', 'AI Refined', enhancementGoal],
          createdAt: Date.now(),
        });
      } else {
        showToast(data.error || 'Failed to enhance prompt', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while enhancing prompt', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const copyToClipboard = (text: string, isEnhanced: boolean) => {
    navigator.clipboard.writeText(text);
    if (isEnhanced) {
      setCopiedEnhanced(true);
      setTimeout(() => setCopiedEnhanced(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
    showToast('Copied to clipboard!', 'success');
  };

  const sendToCreateStudio = (promptToUse: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_image_preload', promptToUse);
    }
    router.push('/create');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E60023]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-red-400">
            <Wand2 className="w-4 h-4" /> AI Prompt Editor & Refiner
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Transform Raw Prompts into Masterpieces
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Paste any basic prompt below and let our AI prompt editor optimize its structure, add professional lighting and camera physics, and calibrate parameters for Midjourney, DALL-E, and Stable Diffusion.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input & Options */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
              <FileText className="w-5 h-5 text-[#E60023]" /> Your Raw Prompt
            </h2>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              {inputPrompt.length} chars
            </span>
          </div>

          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Paste your prompt here (e.g., 'A futuristic city with flying cars')..."
            rows={5}
            className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] text-sm transition-all resize-none shadow-inner"
          />

          {/* Quick Sample Prompts */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Try Sample Prompts:
            </label>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputPrompt(sample)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#E60023] hover:text-white transition-all text-left"
                >
                  {sample.length > 35 ? sample.slice(0, 35) + '...' : sample}
                </button>
              ))}
            </div>
          </div>

          {/* Enhancement Goal Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Enhancement Goal &amp; Style
            </label>
            <select
              value={enhancementGoal}
              onChange={(e) => setEnhancementGoal(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023] transition-all font-medium"
            >
              <option value="Make Cinematic & Photorealistic">Cinematic &amp; Photorealistic (8K, Ray Traced)</option>
              <option value="Midjourney v6 Advanced Format">Midjourney v6 Format (--ar 16:9 --v 6.1)</option>
              <option value="Fantasy & Concept Art Masterpiece">Fantasy &amp; Concept Art Masterpiece</option>
              <option value="Anime & Manga Vibrant Style">Anime &amp; Manga Vibrant Studio Style</option>
              <option value="Product Studio Lighting & Commercial">Product Studio Lighting &amp; Commercial</option>
            </select>
          </div>

          <button
            onClick={handleEditPrompt}
            disabled={isEditing}
            className="w-full py-4 rounded-2xl bg-[#E60023] hover:bg-[#d00020] text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isEditing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> AI is editing &amp; optimizing prompt...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Edit &amp; Enhance Prompt with AI
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Enhanced Result */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-emerald-500" /> AI Enhanced Result
              </h2>
              {resultData && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  Optimized
                </span>
              )}
            </div>

            {resultData ? (
              <div className="space-y-6">
                {/* Enhanced Prompt Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                      Refined Prompt:
                    </span>
                    <button
                      onClick={() => copyToClipboard(resultData.enhancedPrompt, true)}
                      className="text-xs px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white transition-colors flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                      {copiedEnhanced ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedEnhanced ? 'Copied!' : 'Copy Enhanced'}
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm leading-relaxed font-mono">
                    {resultData.enhancedPrompt}
                  </div>
                </div>

                {/* Negative Prompt */}
                {resultData.negativePrompt && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-red-500">Suggested Negative Prompt:</span>
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-neutral-800 dark:text-neutral-200 text-xs font-mono">
                      {resultData.negativePrompt}
                    </div>
                  </div>
                )}

                {/* Improvements Made */}
                {resultData.improvementsMade && resultData.improvementsMade.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Key Enhancements Applied:
                    </span>
                    <ul className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                      {resultData.improvementsMade.map((imp, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E60023]" /> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 space-y-3">
                <Cpu className="w-10 h-10 stroke-[1.5] text-neutral-300 dark:text-neutral-700" />
                <p className="text-sm">
                  Paste your raw prompt on the left and click <span className="font-bold text-neutral-600 dark:text-neutral-300">&ldquo;Edit &amp; Enhance Prompt with AI&rdquo;</span> to view optimized results here.
                </p>
              </div>
            )}
          </div>

          {resultData && (
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-3">
              <button
                onClick={() => sendToCreateStudio(resultData.enhancedPrompt)}
                className="flex-1 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:bg-[#E60023] dark:hover:bg-[#E60023] dark:hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Open in AI Studio Generator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
