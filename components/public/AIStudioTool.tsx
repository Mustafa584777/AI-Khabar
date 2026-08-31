'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AIHistoryItem } from '@/types/prompt';
import {
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Copy,
  Check,
  Download,
  Upload,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Camera,
  Layers,
  Sliders,
  Bookmark,
  Zap,
  History,
  ChevronDown,
  Cpu,
  Trash2,
  ExternalLink,
  Shield,
  SlidersHorizontal,
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

const PROMPT_PRESETS = [
  'Hyperrealistic 8K portrait of a female model, studio rim lighting, 85mm f/1.4 lens, natural skin micro-textures, cinematic color grade',
  'Cyberpunk samurai standing in neon rain alleyway, reflective puddles, volumetric teal and orange lights, photorealistic',
  'Ethereal mythical dragon soaring above glowing crystal mountain peaks, golden hour volumetric fog, masterpiece',
  'Minimalist modern architectural villa with infinity pool at sunset, Bauhaus style, photorealistic textures, 16:9',
  'Cinematic shot of a vintage 1967 Mustang driving along California coastal highway at dusk, film grain 35mm',
];

const GEMINI_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Recommended',
    description: 'Fast, high-fidelity multimodal vision & art direction',
    isDefault: true,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Next-Gen',
    description: 'Advanced reasoning, fine photorealism & composition',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Ultra Fast',
    description: 'Instant lightweight prompt optimization',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    badge: 'Latest',
    description: 'Continuously updated production Flash model',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Deep Creative',
    description: 'Complex cinematic reasoning & art direction',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    badge: 'Lightweight',
    description: 'Fastest generation with reduced latency',
  },
  {
    id: 'imagen-3.0-generate-002',
    name: 'Google Imagen 3',
    badge: 'Photorealistic',
    description: 'Deep photorealism & prompt adherence',
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
  suggestedParameters?: {
    model?: string;
    aspectRatio?: string;
    stylize?: string;
    cfgScale?: string;
    steps?: string;
  };
  tags?: string[];
}

interface GeneratedImageItem {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  referenceImageUrl?: string;
  modelUsed?: string;
  interpretedConcept?: string;
  enhancedPrompt?: string;
  timestamp: number;
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
    persistentRefImage,
  } = useApp();

  const handleGoToHomepage = () => {
    setCurrentView('public');
    if (setSelectedCategory) setSelectedCategory('all');
    if (setSearchQuery) setSearchQuery('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Mode: 'image-to-prompt' vs 'prompt-to-image' (Image to Prompt first by default)
  const [activeMode, setActiveMode] = useState<'image-to-prompt' | 'prompt-to-image'>('image-to-prompt');

  // --- MODE 1: IMAGE TO PROMPT STATE ---
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
  const [styleFocus, setStyleFocus] = useState<string>('Photorealistic & 8K Portrait');
  const [isExtractingPrompt, setIsExtractingPrompt] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ExtractedPromptData | null>(null);
  const [isSavedExtracted, setIsSavedExtracted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- MODE 2: PROMPT TO IMAGE STATE ---
  const [referenceImage, setReferenceImage] = useState<string | null>(() => persistentRefImage);
  const [promptInput, setPromptInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const preloaded = sessionStorage.getItem('promptcms_studio_preload') || sessionStorage.getItem('auraprompt_studio_preload');
      if (preloaded) {
        sessionStorage.removeItem('promptcms_studio_preload');
        sessionStorage.removeItem('auraprompt_studio_preload');
        return preloaded;
      }
    }
    return '';
  });
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>('gemini-2.5-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [enhanceWithAi, setEnhanceWithAi] = useState<boolean>(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [currentGeneratedImage, setCurrentGeneratedImage] = useState<GeneratedImageItem | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isSavedGenerated, setIsSavedGenerated] = useState<boolean>(false);
  const [generationHistory, setGenerationHistory] = useState<GeneratedImageItem[]>([]);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getAspectRatioContainerClass = (ar?: string) => {
    switch (ar) {
      case '16:9':
        return 'aspect-[16/9] w-full';
      case '9:16':
        return 'aspect-[9/16] w-full max-w-[360px] mx-auto';
      case '4:5':
        return 'aspect-[4/5] w-full max-w-[420px] mx-auto';
      case '3:4':
        return 'aspect-[3/4] w-full max-w-[440px] mx-auto';
      case '1:1':
      default:
        return 'aspect-square w-full';
    }
  };

  // Copied helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const copyToClipboard = (text: string, key: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Image Upload Handler for Mode 1
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

  // Reference Image Upload Handler for Mode 2
  const handleRefImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Reference image size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setReferenceImage(base64);
      showToast('Reference image attached! AI will guide generation with its visual style.');
    };
    reader.readAsDataURL(file);
  };

  // Extract Prompt from Image (Mode 1)
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
          styleFocus,
          selectedModel: selectedGeminiModel,
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

  // Save Mode 1 Extracted Prompt to History
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
      modelUsed: selectedGeminiModel,
      tags: extractedData.tags,
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedExtracted(true);
    showToast('Saved to your AI Studio History!');
  };

  // Enhance prompt with Gemini
  const handleEnhancePrompt = async () => {
    if (!promptInput.trim()) {
      showToast('Type a short prompt to enhance first');
      return;
    }

    setIsEnhancingPrompt(true);
    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enhance_prompt',
          prompt: promptInput,
          selectedModel: selectedGeminiModel,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.enhancedPrompt) {
        setPromptInput(json.data.enhancedPrompt);
        showToast('Prompt enhanced with cinematic optics & lighting!');
      }
    } catch (err) {
      console.error('Enhance prompt error:', err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Generate Image from Prompt (Mode 2)
  const handleGenerateImage = async (overridePrompt?: string) => {
    const textToRun = overridePrompt || promptInput;
    if (!textToRun.trim()) {
      showToast('Please enter a prompt text first');
      return;
    }

    setIsGeneratingImage(true);
    setIsImageLoading(true);
    setImageLoadError(false);
    setIsSavedGenerated(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prompt_to_image',
          prompt: textToRun,
          referenceImage: referenceImage || undefined,
          aspectRatio,
          enhanceWithAi,
          selectedModel: selectedGeminiModel,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.imageUrl) {
        const newItem: GeneratedImageItem = {
          id: Date.now().toString(),
          imageUrl: json.data.imageUrl,
          prompt: json.data.prompt || textToRun,
          aspectRatio: json.data.aspectRatio || aspectRatio,
          referenceImageUrl: referenceImage || undefined,
          modelUsed: json.data.modelUsed || selectedGeminiModel,
          interpretedConcept: json.data.interpretedConcept,
          enhancedPrompt: json.data.enhancedPrompt,
          timestamp: Date.now(),
        };

        setCurrentGeneratedImage(newItem);
        setGenerationHistory((prev) => [newItem, ...prev.slice(0, 9)]);
        showToast('Image generated successfully!');
      } else {
        showToast(json.error || 'Failed to generate image');
        setIsImageLoading(false);
      }
    } catch (err) {
      console.error('Image generation error:', err);
      showToast('Failed to generate image. Please try again.');
      setIsImageLoading(false);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRetryImageGeneration = () => {
    if (!currentGeneratedImage) return;
    const newSeed = Math.floor(Math.random() * 9999999) + 1000;
    const cleanPrompt = currentGeneratedImage.prompt
      .replace(/[^\w\s,.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 260);
    const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&model=flux&nologo=true&seed=${newSeed}`;
    setIsImageLoading(true);
    setImageLoadError(false);
    setCurrentGeneratedImage((prev) => prev ? { ...prev, imageUrl: newUrl } : null);
    showToast('Regenerating image with fresh seed...');
  };

  // Save Mode 2 Generated Image to History
  const handleSaveGeneratedToHistory = () => {
    if (!currentGeneratedImage) return;

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to save generated artwork to your history.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'gen_' + Date.now(),
      type: 'prompt_to_image',
      title: promptInput.slice(0, 40) + '...',
      promptText: currentGeneratedImage.prompt,
      imageUrl: currentGeneratedImage.imageUrl,
      referenceImageUrl: currentGeneratedImage.referenceImageUrl,
      aspectRatio: currentGeneratedImage.aspectRatio,
      modelUsed: currentGeneratedImage.modelUsed || selectedGeminiModel,
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedGenerated(true);
    showToast('Saved to your AI Studio History!');
  };

  // Send extracted prompt to Mode 2
  const handleTransferToImageGen = (promptText: string) => {
    setPromptInput(promptText);
    setActiveMode('prompt-to-image');
    showToast('Prompt loaded into Image Generator!');
  };

  // Send generated image to Mode 1
  const handleTransferToImageToPrompt = (imgUrl: string) => {
    setUploadedImage(imgUrl);
    setExtractedData(null);
    setIsSavedExtracted(false);
    setActiveMode('image-to-prompt');
    showToast('Image loaded for Reverse Prompt Extraction!');
  };

  // Download image helper
  const handleDownloadImage = async (url: string, filename = 'generated-prompt-image.jpg') => {
    try {
      showToast('Downloading high-res image...');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const selectedModelObj =
    GEMINI_MODELS.find((m) => m.id === selectedGeminiModel) || GEMINI_MODELS[0];

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentView('public')}
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
        {/* Hero Title & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-[#E60023]" />
              <span>AI Prompt & Image Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Reverse-engineer prompts from any photo or generate high-fidelity AI artwork from text.
            </p>
          </div>

          {/* Segmented Mode Control */}
          <div className="inline-flex p-1 rounded-2xl bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300/60 dark:border-neutral-700/60 shadow-inner">
            <button
              onClick={() => setActiveMode('image-to-prompt')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeMode === 'image-to-prompt'
                  ? 'bg-[#E60023] text-white shadow-md shadow-red-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Image to Prompt</span>
            </button>

            <button
              onClick={() => setActiveMode('prompt-to-image')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeMode === 'prompt-to-image'
                  ? 'bg-[#E60023] text-white shadow-md shadow-red-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Prompt to Image</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: IMAGE TO PROMPT (Reverse Prompt Engineer) */}
        {/* ========================================================================= */}
        {activeMode === 'image-to-prompt' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Input Image & Options (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Image Upload Box */}
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
                          setStyleFocus(sample.style);
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

              {/* Tuning Options (Requirement 4: Target AI Platform removed) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#E60023]" />
                  <span>Aesthetic Style Focus</span>
                </h3>

                {/* Style Focus Selector */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Target Aesthetic & Lens Mood
                  </label>
                  <select
                    value={styleFocus}
                    onChange={(e) => setStyleFocus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Photorealistic & 8K Portrait">Photorealistic & 8K Portrait</option>
                    <option value="Cinematic Film & 35mm Optics">Cinematic Film & 35mm Optics</option>
                    <option value="Studio Editorial & Fashion">Studio Editorial & Fashion</option>
                    <option value="Cyberpunk & Sci-Fi Neon">Cyberpunk & Sci-Fi Neon</option>
                    <option value="Anime & Manga Masterpiece">Anime & Manga Masterpiece</option>
                    <option value="3D Unreal Engine 5 Render">3D Unreal Engine 5 Render</option>
                    <option value="Minimalist Graphic Vector">Minimalist Graphic Vector</option>
                    <option value="Dark Luxury & Moody Lighting">Dark Luxury & Moody Lighting</option>
                  </select>
                </div>

                {/* Submit Action */}
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
                  {/* Master Copy-Ready Prompt Card */}
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
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              extractedData.confidence === 'high'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : extractedData.confidence === 'medium'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                            }`}
                          >
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

                    {/* Quick Action Buttons including Save to History (Requirement 2) */}
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

                      {/* Save to History Button (Requirement 2) */}
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

                      <button
                        onClick={() => handleTransferToImageGen(extractedData.promptText)}
                        className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        <Wand2 className="w-4 h-4 text-amber-500" />
                        <span>Generate with this Prompt</span>
                      </button>
                    </div>
                  </div>

                  {/* Complete 8-Point Reverse Analysis Pipeline */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#E60023]" />
                      <span>Detailed Photographic & Visual Breakdown</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* 1. Subject */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          1. Subject & Presentation
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                          {extractedData.analysis?.subject || 'Primary visible subject identified and preserved'}
                        </span>
                      </div>

                      {/* 2. Pose */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          2. Pose & Body Language
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                          {extractedData.analysis?.pose || 'Reconstructed physical posture and alignment'}
                        </span>
                      </div>

                      {/* 3. Composition */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          3. Composition & Framing
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                          {extractedData.analysis?.composition || extractedData.composition || 'Center Focused Studio Framing'}
                        </span>
                      </div>

                      {/* 4. Camera & Optics */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          4. Camera & Optical Physics
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                          {extractedData.analysis?.camera || extractedData.camera || 'Full-frame sensor with portrait optics'}
                        </span>
                      </div>

                      {/* 5. Lighting */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          5. Lighting Dynamics
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                          {extractedData.analysis?.lighting || extractedData.lighting || 'Directional key light with ambient fill'}
                        </span>
                      </div>

                      {/* 6. Color Grading */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          6. Color Grading & Palette
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                          {extractedData.analysis?.color_grading || extractedData.colorPalette || 'Natural authentic skin tones and contrast'}
                        </span>
                      </div>

                      {/* 7. Environment */}
                      {extractedData.analysis?.environment && (
                        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                            7. Environment & Backdrop
                          </span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                            {extractedData.analysis.environment}
                          </span>
                        </div>
                      )}

                      {/* 8. Post-Processing & Effects */}
                      {extractedData.analysis?.effects && (
                        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                            8. Optical Effects & Texture
                          </span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block leading-relaxed">
                            {extractedData.analysis.effects}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Negative Prompt */}
                    {extractedData.negativePrompt && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            Negative Prompt
                          </span>
                          <button
                            onClick={() => copyToClipboard(extractedData.negativePrompt || '', 'neg-prompt', 'Negative prompt copied!')}
                            className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          >
                            {copiedKey === 'neg-prompt' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                          {extractedData.negativePrompt}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {extractedData.tags && extractedData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {extractedData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
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
        )}

        {/* ========================================================================= */}
        {/* MODE 2: PROMPT TO IMAGE (AI Image Generator) */}
        {/* ========================================================================= */}
        {activeMode === 'prompt-to-image' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Prompt Input & Generator Controls (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
                {/* 1. Model Selector (Requirement 5: Custom Manual Dropdown with all Gemini Models) */}
                <div className="space-y-1.5" ref={dropdownRef}>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#E60023]" />
                      <span>Select AI Model</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      Powered by Google Gemini & Flux
                    </span>
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="w-full p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-left flex items-center justify-between hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      id="gemini-model-dropdown-btn"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-red-100 dark:bg-red-950/70 text-[#E60023] flex items-center justify-center font-bold text-xs shrink-0">
                          ✦
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                              {selectedModelObj.name}
                            </span>
                            <span className="px-2 py-0.2 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-[9px] font-black uppercase">
                              {selectedModelObj.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">
                            {selectedModelObj.description}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ${
                          isModelDropdownOpen ? 'rotate-180 text-[#E60023]' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Items */}
                    {isModelDropdownOpen && (
                      <div className="absolute z-50 mt-2 inset-x-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
                        {GEMINI_MODELS.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedGeminiModel(model.id);
                              setIsModelDropdownOpen(false);
                              showToast(`Selected ${model.name}`);
                            }}
                            className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between ${
                              selectedGeminiModel === model.id
                                ? 'bg-red-50 dark:bg-red-950/50 text-[#E60023]'
                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold">{model.name}</span>
                                <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[9px] font-bold">
                                  {model.badge}
                                </span>
                              </div>
                              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                                {model.description}
                              </span>
                            </div>
                            {selectedGeminiModel === model.id && (
                              <Check className="w-4 h-4 text-[#E60023] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Visual Reference Image Upload (Requirement 5: Image upload option above "Enter Image Prompt") */}
                <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#E60023]" />
                      <span>Visual Reference Image (Optional)</span>
                    </label>
                    {referenceImage && (
                      <button
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="text-[11px] font-semibold text-red-500 hover:underline"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={refImageInputRef}
                    onChange={handleRefImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {referenceImage ? (
                    <div className="relative w-full h-28 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center gap-3 p-2 group">
                      <div className="relative h-full aspect-square rounded-xl overflow-hidden shrink-0">
                        <img
                          src={referenceImage}
                          alt="Reference"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 flex-1 pr-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                          Visual Guide Attached
                        </span>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                          Gemini will analyze this reference photo’s palette & style to guide your generation.
                        </p>
                        <button
                          type="button"
                          onClick={() => refImageInputRef.current?.click()}
                          className="text-[10px] font-bold text-[#E60023] hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Change Photo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => refImageInputRef.current?.click()}
                      className="w-full p-3 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] dark:hover:border-[#E60023] bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center gap-2.5 cursor-pointer transition-colors group text-center"
                    >
                      <Upload className="w-4 h-4 text-neutral-400 group-hover:text-[#E60023] transition-colors" />
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white">
                        Upload reference image for guided style & composition
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Prompt Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-[#E60023]" />
                      <span>Enter Image Prompt</span>
                    </h3>
                    <button
                      type="button"
                      disabled={isEnhancingPrompt || !promptInput.trim()}
                      onClick={handleEnhancePrompt}
                      className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      title="Enrich prompt with photographic lens and lighting"
                    >
                      {isEnhancingPrompt ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Enhancing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>AI Enhance</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <textarea
                      rows={4}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Describe the image you want to create (e.g. 8K portrait of a neon cyberpunk warrior in rain, 85mm lens, atmospheric lighting...)"
                      className="w-full p-4 text-xs sm:text-sm rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-neutral-400"
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400 px-1">
                      <span>{promptInput.length} characters</span>
                      {promptInput && (
                        <button
                          onClick={() => setPromptInput('')}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Inspiration Prompts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Quick Prompt Ideas:
                    </span>
                    <button
                      type="button"
                      onClick={handleGoToHomepage}
                      className="text-[11px] font-bold text-[#E60023] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                      title="Browse all prompts on homepage"
                    >
                      <span>More prompts...</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {PROMPT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPromptInput(preset)}
                        className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition-colors truncate max-w-[260px] text-left"
                        title={preset}
                      >
                        {preset.slice(0, 35)}...
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleGoToHomepage}
                      className="px-3 py-1 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 hover:bg-[#E60023] hover:text-white text-[#E60023] text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      title="Browse all prompts on homepage"
                    >
                      <span>More prompts...</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: '1:1', label: '1:1', desc: 'Square' },
                      { id: '16:9', label: '16:9', desc: 'Landscape' },
                      { id: '9:16', label: '9:16', desc: 'Story' },
                      { id: '4:5', label: '4:5', desc: 'Social' },
                      { id: '3:4', label: '3:4', desc: 'Portrait' },
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          aspectRatio === ar.id
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                            : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        <div className="text-xs font-black">{ar.label}</div>
                        <div className="text-[10px] opacity-70">{ar.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>



                {/* Generate Action Button */}
                <button
                  type="button"
                  disabled={!promptInput.trim() || isGeneratingImage}
                  onClick={() => handleGenerateImage()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E60023] to-[#ff3b56] hover:from-red-700 hover:to-red-600 text-white text-sm font-black shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Synthesizing High-Resolution Visual with {selectedModelObj.name}...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>Generate Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Generated Image Result Display & History (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {currentGeneratedImage ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Main Result Card */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Generation Complete
                      </span>
                      <div className="flex items-center gap-2">
                        {currentGeneratedImage.modelUsed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {currentGeneratedImage.modelUsed}
                          </span>
                        )}
                        <span className="text-xs font-bold text-neutral-400">
                          {currentGeneratedImage.aspectRatio}
                        </span>
                      </div>
                    </div>

                    {/* Rendered Image Container */}
                    <div
                      className={`relative rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center ${getAspectRatioContainerClass(
                        currentGeneratedImage.aspectRatio
                      )}`}
                    >
                      {/* Loading skeleton / shimmer */}
                      {isImageLoading && (
                        <div className="absolute inset-0 z-10 bg-neutral-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#E60023]" />
                          <div className="space-y-1">
                            <span className="text-xs font-bold block">Rendering High-Res Visual...</span>
                            <span className="text-[11px] text-neutral-300">Applying neural diffusion synthesis</span>
                          </div>
                        </div>
                      )}

                      {/* Image Error Fallback */}
                      {imageLoadError ? (
                        <div className="p-6 text-center space-y-3 max-w-sm">
                          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                              Rendering Visual
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              Click below to synthesize a fresh variation
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleRetryImageGeneration}
                              className="px-4 py-2 rounded-xl bg-[#E60023] text-white text-xs font-bold shadow-xs hover:bg-[#ad081b] transition-colors"
                            >
                              Regenerate Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={currentGeneratedImage.imageUrl}
                          alt="AI Generated Visual"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          onLoad={() => setIsImageLoading(false)}
                          onError={() => {
                            setIsImageLoading(false);
                            setImageLoadError(true);
                          }}
                        />
                      )}
                    </div>

                    {/* Result Actions including Save to History (Requirement 2) */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        onClick={() => handleDownloadImage(currentGeneratedImage.imageUrl, `ai-prompt-image-${currentGeneratedImage.id}.jpg`)}
                        className="px-4 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download High-Res</span>
                      </button>

                      {/* Regenerate Variation Button */}
                      <button
                        onClick={handleRetryImageGeneration}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                        title="Generate a new variation with a new seed"
                      >
                        <RefreshCw className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        <span>Regenerate</span>
                      </button>

                      {/* Save to History Button */}
                      <button
                        onClick={handleSaveGeneratedToHistory}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSavedGenerated
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-red-400'
                        }`}
                        title="Save to your personal generation history"
                      >
                        {isSavedGenerated ? (
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

                      <button
                        onClick={() => copyToClipboard(currentGeneratedImage.prompt, 'gen-prompt', 'Prompt copied!')}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        {copiedKey === 'gen-prompt' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleTransferToImageToPrompt(currentGeneratedImage.imageUrl)}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        title="Reverse-engineer this generated image to prompt"
                      >
                        <Camera className="w-4 h-4 text-[#E60023]" />
                        <span>Reverse-Engineer</span>
                      </button>
                    </div>

                    {/* Director Interpreted Concept & Production Prompt Box */}
                    <div className="space-y-2.5">
                      {currentGeneratedImage.interpretedConcept && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200">
                          <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-900 dark:text-amber-300">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Director Visual Interpretation:</span>
                          </div>
                          <p className="leading-relaxed">{currentGeneratedImage.interpretedConcept}</p>
                        </div>
                      )}

                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="font-bold text-neutral-900 dark:text-white block mb-0.5">
                          Production Prompt:
                        </span>
                        {currentGeneratedImage.prompt}
                      </div>
                    </div>
                  </div>

                  {/* History Carousel */}
                  {generationHistory.length > 1 && (
                    <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Session History ({generationHistory.length})
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        {generationHistory.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setCurrentGeneratedImage(item);
                              setIsSavedGenerated(false);
                            }}
                            className={`group relative rounded-xl overflow-hidden aspect-square border transition-all ${
                              currentGeneratedImage.id === item.id
                                ? 'ring-2 ring-[#E60023]'
                                : 'border-neutral-200 dark:border-neutral-700 hover:opacity-80'
                            }`}
                          >
                            <Image
                              src={item.imageUrl}
                              alt="history item"
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center mx-auto">
                    <Wand2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      AI Image Canvas
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                      Write any idea in the prompt box on the left, attach an optional visual reference photo, and click &quot;Generate AI Artwork&quot; to synthesize instant photorealistic visuals.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
