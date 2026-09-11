'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AIHistoryItem } from '@/types/prompt';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  ArrowLeft,
  RefreshCw,
  Camera,
  Sliders,
  Bookmark,
  History,
  Zap,
  Coins,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const FALLBACK_SAMPLE_IMAGES = [
  {
    name: '80s Bollywood Couple',
    url: 'https://res.cloudinary.com/idbpgaqz/image/upload/v1789084501/prompts/prompt-1789084496535.webp',
    style: 'Photorealistic & Portraits',
  },
  {
    name: '80s Golden Hour Vintage',
    url: 'https://res.cloudinary.com/idbpgaqz/image/upload/v1789084425/prompts/prompt-1789084418854.webp',
    style: 'Photorealistic & Portraits',
  },
  {
    name: 'Retro 80s Studio Glamour',
    url: 'https://res.cloudinary.com/idbpgaqz/image/upload/v1789084365/prompts/prompt-1789084357771.webp',
    style: 'Photorealistic & Portraits',
  },
  {
    name: 'Vintage 80s Cinematic Pose',
    url: 'https://res.cloudinary.com/idbpgaqz/image/upload/v1789084305/prompts/prompt-1789084297672.webp',
    style: 'Cinematic 8K',
  },
];

interface ExtractedPromptData {
  title?: string;
  summary?: string;
  confidence?: 'high' | 'medium' | 'low' | string;
  promptText: string;
  prompt?: string;
  negativePrompt?: string;
  negative_prompt?: string;
  camera?: string;
  lighting?: string;
  composition?: string;
  colorPalette?: string;
  aspectRatio?: string;
  aspect_ratio?: string;
  analysis?: {
    subject?: string;
    pose?: string;
    composition?: string;
    environment?: string;
    camera?: string;
    lighting?: string;
    color_grading?: string;
    effects?: string;
    text_and_layout?: string;
  };
  tags?: string[];
}

export const AIStudioTool = () => {
  const router = useRouter();
  const {
    posts,
    setCurrentView,
    setSelectedCategory,
    setSearchQuery,
    showToast,
    userAccount,
    openAuthModal,
    saveAiHistoryItem,
    toolCredits,
    deductToolCredit,
    isAuthenticated,
  } = useApp();

  const [toolMode, setToolMode] = useState<'text-prompt' | 'image-prompt'>('text-prompt');
  const [ideaInput, setIdeaInput] = useState<string>('');
  const [selectedLighting, setSelectedLighting] = useState<string>('Cinematic Golden Hour');
  const [selectedColorGrading, setSelectedColorGrading] = useState<string>('Teal & Orange Cinematic');
  const [selectedGender, setSelectedGender] = useState<string>('Neutral / Unspecified');
  const [isGeneratingTextPrompt, setIsGeneratingTextPrompt] = useState<boolean>(false);
  const [textPromptResult, setTextPromptResult] = useState<ExtractedPromptData | null>(null);
  const [isSavedTextPrompt, setIsSavedTextPrompt] = useState<boolean>(false);

  const LIGHTING_OPTIONS = [
    'Cinematic Golden Hour',
    'Dramatic Studio Lighting',
    'Soft Diffused Morning Light',
    'Cyberpunk Neon Glow',
    'Moody Noir Shadows',
    'Neon Rim Light',
    'Studio High-Key Lighting',
    'Natural Overcast Daylight',
  ];

  const COLOR_GRADING_OPTIONS = [
    'Teal & Orange Cinematic',
    'Vintage 35mm Film',
    'Moody Desaturated',
    'Vibrant Cyberpunk Neon',
    'Warm Golden Vintage',
    'Cinematic Teal & Teal',
    'Clean Minimalist',
    'Pastel Aesthetic',
  ];

  const GENDER_OPTIONS = [
    'Neutral / Unspecified',
    'Female / Woman',
    'Male / Man',
    'Non-Binary / Androgynous',
    'Group / Multiple Subjects',
  ];

  // Pick latest published prompt images as sample presets
  const sampleImages = React.useMemo(() => {
    const latestWithImages = (posts || [])
      .filter((p) => p.imageUrl && p.imageUrl.startsWith('http'))
      .slice(0, 4);

    if (latestWithImages.length >= 4) {
      return latestWithImages.map((p) => ({
        name: p.title,
        url: p.imageUrl,
        style: p.category || 'Trending Prompt',
      }));
    }
    return FALLBACK_SAMPLE_IMAGES;
  }, [posts]);

  const [uploadedImage, setUploadedImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const img = sessionStorage.getItem('promptcms_studio_image_preload') || sessionStorage.getItem('auraprompt_studio_image_preload');
      if (img) {
        sessionStorage.removeItem('promptcms_studio_image_preload');
        sessionStorage.removeItem('auraprompt_studio_image_preload');
        return img;
      }
    }
    return null;
  });

  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isExtractingPrompt, setIsExtractingPrompt] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ExtractedPromptData | null>(null);
  const [isSavedExtracted, setIsSavedExtracted] = useState<boolean>(false);
  const [isOutOfCreditsModalOpen, setIsOutOfCreditsModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const copyToClipboard = (text: string, key: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateTextPrompt = async () => {
    if (!ideaInput.trim()) {
      showToast('Please enter an idea or keywords for your prompt');
      return;
    }

    setIsGeneratingTextPrompt(true);
    setTextPromptResult(null);
    setIsSavedTextPrompt(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'text_to_prompt',
          idea: ideaInput,
          lighting: selectedLighting,
          colorGrading: selectedColorGrading,
          gender: selectedGender,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setTextPromptResult({
          title: json.data.title || ideaInput,
          summary: json.data.summary,
          promptText: json.data.promptText || json.data.prompt || '',
          negativePrompt: json.data.negativePrompt || json.data.negative_prompt || '',
          camera: json.data.camera || '85mm f/1.4 portrait lens',
          lighting: selectedLighting,
          colorPalette: selectedColorGrading,
          aspectRatio: json.data.aspectRatio || '16:9',
          confidence: json.data.confidence || 'high',
          tags: json.data.tags || ['AI Prompt Generator', selectedGender, selectedLighting, selectedColorGrading],
        });
        showToast('Detailed AI prompt generated successfully!');
      } else {
        showToast(json.error || 'Failed to generate prompt');
      }
    } catch (err) {
      console.error('Text prompt generation error:', err);
      showToast('An error occurred while generating prompt');
    } finally {
      setIsGeneratingTextPrompt(false);
    }
  };

  const handleSaveTextPromptToHistory = () => {
    if (!textPromptResult) return;

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to save generated prompts to your history.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'txt_' + Date.now(),
      type: 'text_to_prompt',
      title: textPromptResult.title || 'Generated Prompt',
      promptText: textPromptResult.promptText,
      negativePrompt: textPromptResult.negativePrompt,
      camera: textPromptResult.camera,
      lighting: textPromptResult.lighting,
      colorPalette: textPromptResult.colorPalette,
      aspectRatio: textPromptResult.aspectRatio || '16:9',
      tags: textPromptResult.tags,
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedTextPrompt(true);
    showToast('Saved to your AI Studio History!');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage(base64);
      setExtractedData(null);
      setIsSavedExtracted(false);
      showToast('Image loaded! Click "Extract AI Prompt" to analyze.');
    };
    reader.readAsDataURL(file);
  };

  const handleExtractPrompt = async () => {
    if (!uploadedImage) {
      showToast('Please upload or select an image first');
      return;
    }

    const IMAGE_TO_PROMPT_COST = 3;
    if (toolCredits < IMAGE_TO_PROMPT_COST) {
      setIsOutOfCreditsModalOpen(true);
      showToast(`Image-to-prompt requires 3 credits (You have ${toolCredits}). Top up credits or upgrade!`);
      return;
    }

    setIsExtractingPrompt(true);
    setExtractedData(null);
    setIsSavedExtracted(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'image_to_prompt',
          image: uploadedImage,
          customInstructions,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        deductToolCredit(IMAGE_TO_PROMPT_COST);
        setExtractedData(json.data);
        showToast(`Prompt reverse-engineered! 3 credits used (${Math.max(0, toolCredits - IMAGE_TO_PROMPT_COST)} left)`);
      } else {
        showToast(json.error || 'Failed to extract prompt from image');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      showToast('An error occurred during prompt extraction');
    } finally {
      setIsExtractingPrompt(false);
    }
  };

  const handleSaveExtractedToHistory = () => {
    if (!extractedData) return;

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to save extracted prompts to your history.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'ext_' + Date.now(),
      type: 'image_to_prompt',
      title: extractedData.title || 'Extracted Studio Prompt',
      promptText: extractedData.promptText,
      negativePrompt: extractedData.negativePrompt,
      referenceImageUrl: uploadedImage || undefined,
      camera: extractedData.camera,
      lighting: extractedData.lighting,
      composition: extractedData.composition,
      colorPalette: extractedData.colorPalette,
      aspectRatio: extractedData.aspectRatio || '16:9',
      tags: extractedData.tags,
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedExtracted(true);
    showToast('Saved to your AI Studio History!');
  };

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              setCurrentView('public');
              if (setSelectedCategory) setSelectedCategory('all');
              if (setSearchQuery) setSearchQuery('');
              router.push('/');
            }}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Tool Credits Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-xs">
              <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{toolCredits} Credits</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hidden sm:inline">• Free Daily</span>
              <Link
                href="/pricing"
                className="text-[11px] font-black text-[#E60023] hover:underline ml-1"
              >
                + Top Up
              </Link>
            </div>

            <button
              onClick={() => {
                setCurrentView('user-dashboard');
                router.push('/dashboard');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[#E60023]" />
              <span>View History</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Hero Title & Mode Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-[#E60023]" />
              <span>AI Prompt Generator Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Create professional detailed prompts from an idea with lighting, colour grading, and gender controls, or reverse-engineer from photos.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-neutral-200 dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-300 dark:border-neutral-800 self-start">
            <button
              onClick={() => setToolMode('text-prompt')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                toolMode === 'text-prompt'
                  ? 'bg-white dark:bg-neutral-800 text-[#E60023] shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Idea-to-Prompt Generator</span>
            </button>
            <button
              onClick={() => setToolMode('image-prompt')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                toolMode === 'image-prompt'
                  ? 'bg-white dark:bg-neutral-800 text-[#E60023] shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Image-to-Prompt</span>
            </button>
          </div>
        </div>

        {/* 1. TEXT PROMPT GENERATOR MODE */}
        {toolMode === 'text-prompt' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Idea Input & Dropdowns (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E60023]" />
                  <span>1. Enter Your Idea or Keywords</span>
                </h3>

                <div>
                  <textarea
                    rows={3}
                    value={ideaInput}
                    onChange={(e) => setIdeaInput(e.target.value)}
                    placeholder="e.g. Cyberpunk samurai standing in neon rain in Tokyo..."
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all"
                    id="create-idea-input"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="text-[10px] font-semibold text-neutral-400">Try ideas:</span>
                    {[
                      'Vintage 80s studio glamour portrait',
                      'Futuristic hyper-car in neon alley',
                      'Mystical elf archer in enchanted forest',
                      'Minimalist luxury coffee cup mockup',
                    ].map((sampleIdea) => (
                      <button
                        key={sampleIdea}
                        type="button"
                        onClick={() => setIdeaInput(sampleIdea)}
                        className="text-[10px] font-medium px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
                      >
                        {sampleIdea}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dropdowns */}
                <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#E60023]" />
                    <span>2. Select Style Parameters</span>
                  </h3>

                  {/* Lighting Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Lighting Style
                    </label>
                    <select
                      value={selectedLighting}
                      onChange={(e) => setSelectedLighting(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                      id="lighting-select"
                    >
                      {LIGHTING_OPTIONS.map((light) => (
                        <option key={light} value={light}>
                          {light}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Colour Grading Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Colour Grading
                    </label>
                    <select
                      value={selectedColorGrading}
                      onChange={(e) => setSelectedColorGrading(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                      id="colour-grading-select"
                    >
                      {COLOR_GRADING_OPTIONS.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gender Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Gender / Subject Presentation
                    </label>
                    <select
                      value={selectedGender}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                      id="gender-select"
                    >
                      {GENDER_OPTIONS.map((gen) => (
                        <option key={gen} value={gen}>
                          {gen}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!ideaInput.trim() || isGeneratingTextPrompt}
                  onClick={handleGenerateTextPrompt}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E60023] to-[#ff3b56] hover:from-red-700 hover:to-red-600 text-white text-xs sm:text-sm font-black shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  id="generate-prompt-action-btn"
                >
                  {isGeneratingTextPrompt ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Crafting Detailed Prompt...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Detailed Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Generated Detailed Prompt Output (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {textPromptResult ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-red-100 dark:border-red-950/80 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#E60023] animate-ping" />
                        <h3 className="text-base font-black text-neutral-900 dark:text-white">
                          {textPromptResult.title}
                        </h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#E60023] text-[11px] font-bold">
                        Master Prompt Ready
                      </span>
                    </div>

                    {textPromptResult.summary && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 italic">
                        ✦ {textPromptResult.summary}
                      </p>
                    )}

                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed break-words select-all">
                      {textPromptResult.promptText}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        onClick={() => copyToClipboard(textPromptResult.promptText, 'text-prompt-output', 'Master prompt copied!')}
                        className="px-4 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {copiedKey === 'text-prompt-output' ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleSaveTextPromptToHistory}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSavedTextPrompt
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-red-400'
                        }`}
                      >
                        {isSavedTextPrompt ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Saved to History</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 text-[#E60023]" />
                            <span>Save to My History</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Parameter Breakdown */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#E60023]" />
                      <span>Applied Parameters & Optics</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Lighting Style</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">{selectedLighting}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Colour Grading</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">{selectedColorGrading}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Subject Presentation</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">{selectedGender}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Camera & Optics</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">{textPromptResult.camera}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Ready to Generate Your Prompt
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                      Type your idea on the left, choose lighting, colour grading, and gender, then click &quot;Generate Detailed Prompt&quot; to build an expert-level AI prompt.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 2. IMAGE TO PROMPT STUDIO MODE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Input Image & Options (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#E60023]" />
                    <span>Upload Image to Reverse</span>
                  </h3>
                  {uploadedImage && (
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setExtractedData(null);
                        setIsSavedExtracted(false);
                      }}
                      className="text-xs font-semibold text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {uploadedImage ? (
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 group">
                    <Image
                      src={uploadedImage}
                      alt="Uploaded target"
                      fill
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-full bg-white text-neutral-900 text-xs font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] dark:hover:border-[#E60023] bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                      Click to upload or drag & drop photo
                    </span>
                    <span className="text-[11px] text-neutral-400 mt-1">
                      PNG, JPG, WebP up to 10MB
                    </span>
                  </div>
                )}

                {/* Sample Presets */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Or Pick a Sample Photo:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {sampleImages.map((sample) => (
                      <button
                        key={sample.name}
                        onClick={() => {
                          setUploadedImage(sample.url);
                          setExtractedData(null);
                          setIsSavedExtracted(false);
                        }}
                        className="group relative rounded-xl overflow-hidden aspect-square border border-neutral-200 dark:border-neutral-700 hover:ring-2 hover:ring-[#E60023] transition-all"
                      >
                        <Image
                          src={sample.url}
                          alt={sample.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 px-1 text-[9px] font-bold text-white text-center truncate">
                          {sample.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#E60023]" />
                    <span>Custom Instructions</span>
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    Optional
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Custom prompt instructions & constraints
                  </label>
                  <textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="remove watermark, 250 words minimum length, remove text or add something"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all"
                  />
                </div>

                <button
                  type="button"
                  disabled={!uploadedImage || isExtractingPrompt}
                  onClick={handleExtractPrompt}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E60023] to-[#ff3b56] hover:from-red-700 hover:to-red-600 text-white text-xs sm:text-sm font-black shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtractingPrompt ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Reverse-Engineering Photographic DNA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract AI Prompt from Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Output Extracted Prompt & Breakdown (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {extractedData ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-red-100 dark:border-red-950/80 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#E60023] animate-ping" />
                        <h3 className="text-base font-black text-neutral-900 dark:text-white">
                          {extractedData.title || 'Extracted AI Prompt'}
                        </h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#E60023] text-[11px] font-bold">
                        Master Prompt
                      </span>
                    </div>

                    {extractedData.summary && (
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 italic flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#E60023] shrink-0 not-italic" />
                        <span>{extractedData.summary}</span>
                      </div>
                    )}

                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed break-words select-all">
                      {extractedData.promptText}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        onClick={() => copyToClipboard(extractedData.promptText, 'extracted-prompt', 'Master prompt copied!')}
                        className="px-4 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {copiedKey === 'extracted-prompt' ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleSaveExtractedToHistory}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSavedExtracted
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-red-400'
                        }`}
                      >
                        {isSavedExtracted ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Saved to History</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 text-[#E60023]" />
                            <span>Save to My History</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Ready to Reverse Any Photo
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                      Upload an image on the left or select a sample photo, then click &quot;Extract AI Prompt&quot;.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Out of Credits Modal */}
      {isOutOfCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 text-center relative">
            <button
              onClick={() => setIsOutOfCreditsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
              <Coins className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                Out of Tool Credits
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Image-to-prompt extraction requires credits. Top up or wait for daily free credits.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setIsOutOfCreditsModalOpen(false);
                  router.push('/pricing');
                }}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#E60023] to-[#ff3b56] hover:from-red-700 hover:to-red-600 text-white text-xs sm:text-sm font-black shadow-md shadow-red-500/20 transition-all"
              >
                View Pricing Plans & Get Credits
              </button>
              <button
                onClick={() => setIsOutOfCreditsModalOpen(false)}
                className="w-full py-2.5 rounded-full text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
