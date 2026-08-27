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
} from 'lucide-react';
import Image from 'next/image';

const SAMPLE_IMAGES = [
  {
    name: 'Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    style: 'Cyberpunk & Sci-Fi',
  },
  {
    name: 'Studio Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    style: 'Photorealistic & Portraits',
  },
  {
    name: 'Cinematic Nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    style: 'Cinematic 8K',
  },
  {
    name: '3D Render',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    style: '3D Art & Unreal Engine',
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
  const {
    setCurrentView,
    setSelectedCategory,
    setSearchQuery,
    showToast,
    userAccount,
    openAuthModal,
    saveAiHistoryItem,
  } = useApp();

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
          customInstructions: customInstructions.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setExtractedData(json.data);
        showToast('Prompt successfully reverse-engineered!');
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
            }}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('user-dashboard')}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[#E60023]" />
              <span>View History in Dashboard</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#E60023] text-xs font-black">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>AI Studio Lab</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Hero Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-[#E60023]" />
              <span>AI Image-to-Prompt Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Reverse-engineer precise, high-fidelity AI prompts from any photo or visual with optical analysis.
            </p>
          </div>
        </div>

        {/* IMAGE TO PROMPT STUDIO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  {SAMPLE_IMAGES.map((sample) => (
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
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 px-1 text-[9px] font-bold text-white text-center truncate">
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
                  <span>Custom Instructions (Optional)</span>
                </h3>
                {customInstructions && (
                  <button
                    type="button"
                    onClick={() => setCustomInstructions('')}
                    className="text-[11px] font-semibold text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Tailor prompt extraction & reverse modifications:
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="remove watermark, text or add something..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 leading-relaxed"
                />
              </div>

              {/* Quick suggestion chips */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                  Quick Add Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'remove watermark & logos',
                    'remove text & overlays',
                    'clean background',
                    'add golden hour lighting',
                    'cinematic film 35mm grain',
                    'photorealistic 8K portrait',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setCustomInstructions((prev) => {
                          const trimmed = prev.trim();
                          if (!trimmed) return suggestion;
                          if (trimmed.toLowerCase().includes(suggestion.toLowerCase())) return trimmed;
                          return `${trimmed}, ${suggestion}`;
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-[#E60023] hover:border-red-300 dark:hover:border-red-800 text-neutral-600 dark:text-neutral-300 text-[11px] font-medium transition-colors border border-neutral-200 dark:border-neutral-700"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!uploadedImage || isExtractingPrompt}
                onClick={handleExtractPrompt}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E60023] to-[#ff3b56] hover:from-red-700 hover:to-red-600 text-white text-xs sm:text-sm font-black shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                    <div className="flex items-center gap-2">
                      {extractedData.confidence && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {extractedData.confidence} Confidence
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#E60023] text-[11px] font-bold">
                        Master Prompt
                      </span>
                    </div>
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
                      title="Save to your personal generation history"
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

                {/* Detailed Photographic Breakdown */}
                <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#E60023]" />
                    <span>Detailed Photographic & Visual Breakdown</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        1. Subject & Presentation
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                        {extractedData.analysis?.subject || 'Primary visible subject identified and preserved'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        2. Pose & Body Language
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                        {extractedData.analysis?.pose || 'Reconstructed physical posture and alignment'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        3. Composition & Framing
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                        {extractedData.analysis?.composition || extractedData.composition || 'Center Focused Studio Framing'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        4. Camera & Optical Physics
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                        {extractedData.analysis?.camera || extractedData.camera || 'Full-frame sensor with portrait optics'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        5. Lighting Dynamics
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                        {extractedData.analysis?.lighting || extractedData.lighting || 'Directional key light with ambient fill'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        6. Color Grading & Palette
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                        {extractedData.analysis?.color_grading || extractedData.colorPalette || 'Natural authentic skin tones and contrast'}
                      </span>
                    </div>
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
                    Upload an image on the left or select a sample photo, then click &quot;Extract AI Prompt&quot;. Our AI will decode its photographic DNA into an exact prompt.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
