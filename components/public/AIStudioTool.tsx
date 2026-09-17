'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AIHistoryItem } from '@/types/prompt';
import confetti from 'canvas-confetti';
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
  Wand2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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

const TEXT_PROMPT_PRESETS = [
  'Cyberpunk samurai walking in rainy neon Tokyo street',
  'Vintage 35mm film portrait in Parisian sidewalk café',
  'Futuristic astronaut exploring a glowing bioluminescent crystal cave',
  'High-fashion streetwear model in brutalist concrete architecture',
  'Hyperrealistic wildlife macro photo of an iridescent hummingbird',
];

const LIGHTING_OPTIONS = [
  'Cinematic Golden Hour',
  'Volumetric Fog & Neon',
  'Softbox Studio Portrait',
  'Dramatic Rembrandt Chiaroscuro',
  'Harsh Direct Sunlight',
  'Moody Low-Key Noir',
  'Ethereal Sunset Backlight',
  'Natural Overcast Diffused',
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

const CAMERA_OPTIONS = [
  'Hasselblad H6D-100c, 85mm f/1.4',
  'Leica M11, 35mm f/1.4 Summilux',
  'Sony A7R V, 50mm f/1.2 GM',
  'Canon EOS R5, 100mm f/2.8 Macro',
  'ARRI Alexa Mini, 24mm Anamorphic',
];

const ENGINE_OPTIONS = [
  'Midjourney v6.1',
  'Flux.1 Schnell / Dev',
  'Google Imagen 3 / Gemini',
  'ChatGPT / DALL-E 3',
];

const RATIO_OPTIONS = [
  { label: '16:9 Landscape', value: '16:9' },
  { label: '9:16 Story / Reel', value: '9:16' },
  { label: '1:1 Square', value: '1:1' },
  { label: '4:5 Instagram Portrait', value: '4:5' },
  { label: '4:3 Classic', value: '4:3' },
];

interface GeneratedPromptData {
  title?: string;
  summary?: string;
  promptText: string;
  prompt?: string;
  negativePrompt?: string;
  negative_prompt?: string;
  camera?: string;
  lighting?: string;
  composition?: string;
  colorPalette?: string;
  aspectRatio?: string;
  tags?: string[];
  analysis?: any;
}

export const AIStudioTool = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    setCurrentView,
    setSelectedCategory,
    setSearchQuery,
    showToast,
    userAccount,
    openAuthModal,
    saveAiHistoryItem,
    toolCredits,
    deductToolCredit,
  } = useApp();

  // Active Tool Switch: 'text_to_prompt' (2 credits), 'image_to_prompt' (3 credits), 'prompt_enhancer' (1 credit), or 'prompt_editor' (1 credit)
  const [activeTool, setActiveTool] = useState<'text_to_prompt' | 'image_to_prompt' | 'prompt_enhancer' | 'prompt_editor'>(() => {
    if (typeof window !== 'undefined') {
      const hasImage =
        sessionStorage.getItem('promptcms_studio_image_preload') ||
        sessionStorage.getItem('auraprompt_studio_image_preload');
      if (hasImage) return 'image_to_prompt';
    }
    return 'text_to_prompt';
  });

  // ==========================================
  // TEXT TO PROMPT STATE (2 Credits)
  // ==========================================
  const [textIdea, setTextIdea] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlIdea = urlParams.get('idea') || urlParams.get('prompt');
        if (urlIdea && urlIdea.trim()) return urlIdea.trim();

        const pendingText =
          sessionStorage.getItem('pending_text_to_prompt') ||
          sessionStorage.getItem('promptcms_studio_preload') ||
          sessionStorage.getItem('auraprompt_studio_preload') ||
          localStorage.getItem('pending_text_to_prompt');
        if (pendingText && pendingText.trim()) {
          return pendingText.trim();
        }
      } catch {}
    }
    return '';
  });

  const [preloadedFromHome, setPreloadedFromHome] = useState<boolean>(() => {
    return Boolean(textIdea);
  });

  const [lighting, setLighting] = useState<string>('Cinematic Golden Hour');
  const [colorGrading, setColorGrading] = useState<string>('Cinematic Teal & Orange');
  const [camera, setCamera] = useState<string>('Hasselblad H6D-100c, 85mm f/1.4');
  const [targetEngine, setTargetEngine] = useState<string>('Midjourney v6.1');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [negativeConstraints, setNegativeConstraints] = useState<string>('');
  const [showAdvancedTextOptions, setShowAdvancedTextOptions] = useState<boolean>(false);

  const [isGeneratingTextPrompt, setIsGeneratingTextPrompt] = useState<boolean>(false);
  const [generatedTextData, setGeneratedTextData] = useState<GeneratedPromptData | null>(null);
  const [isSavedTextPrompt, setIsSavedTextPrompt] = useState<boolean>(false);

  // ==========================================
  // IMAGE TO PROMPT STATE (3 Credits)
  // ==========================================
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pendingImage =
        sessionStorage.getItem('promptcms_studio_image_preload') ||
        sessionStorage.getItem('auraprompt_studio_image_preload');
      if (pendingImage) {
        sessionStorage.removeItem('promptcms_studio_image_preload');
        sessionStorage.removeItem('auraprompt_studio_image_preload');
        return pendingImage;
      }
    }
    return null;
  });

  const [imageInstructions, setImageInstructions] = useState<string>('');
  const [isExtractingImagePrompt, setIsExtractingImagePrompt] = useState<boolean>(false);
  const [extractedImageData, setExtractedImageData] = useState<GeneratedPromptData | null>(null);
  const [isSavedImageExtracted, setIsSavedImageExtracted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // PROMPT ENHANCER STATE (1 Credit)
  // ==========================================
  const [basicPrompt, setBasicPrompt] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhancedData, setEnhancedData] = useState<GeneratedPromptData | null>(null);
  const [isSavedEnhanced, setIsSavedEnhanced] = useState<boolean>(false);

  // ==========================================
  // PROMPT EDITOR STATE (1 Credit)
  // ==========================================
  const [editorOriginalPrompt, setEditorOriginalPrompt] = useState<string>('');
  const [editorInstructions, setEditorInstructions] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedData, setEditedData] = useState<GeneratedPromptData | null>(null);
  const [isSavedEdited, setIsSavedEdited] = useState<boolean>(false);

  // Global Tool State
  const [isOutOfCreditsModalOpen, setIsOutOfCreditsModalOpen] = useState<boolean>(false);
  const [requiredCreditsForModal, setRequiredCreditsForModal] = useState<number>(2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Scroll to top and verify authentication on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to use the AI Studio tools with your free credits.');
    }
  }, [userAccount?.isLoggedIn, openAuthModal]);

  // Synchronize preloaded idea from URL query params or storage across redirects/mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const queryIdea = searchParams?.get('idea') || searchParams?.get('prompt');
        const storedIdea =
          sessionStorage.getItem('pending_text_to_prompt') ||
          sessionStorage.getItem('promptcms_studio_preload') ||
          sessionStorage.getItem('auraprompt_studio_preload') ||
          localStorage.getItem('pending_text_to_prompt');

        const incoming = (queryIdea && queryIdea.trim()) || (storedIdea && storedIdea.trim());
        if (incoming) {
          setTextIdea((prev) => (prev ? prev : incoming));
          setPreloadedFromHome(true);
          setActiveTool('text_to_prompt');

          // Clean up temporary storage so subsequent visits start fresh
          sessionStorage.removeItem('pending_text_to_prompt');
          sessionStorage.removeItem('promptcms_studio_preload');
          sessionStorage.removeItem('auraprompt_studio_preload');
          localStorage.removeItem('pending_text_to_prompt');
        }
      } catch (err) {
        console.warn('Could not sync preloaded prompt idea:', err);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams, userAccount?.isLoggedIn]);

  const copyToClipboard = (text: string, key: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ==========================================
  // HANDLER: GENERATE TEXT TO PROMPT (2 Credits)
  // ==========================================
  const handleGenerateTextPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanIdea = textIdea.trim();
    if (!cleanIdea) {
      showToast('Please enter a photo prompt idea or description');
      return;
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or register to generate AI prompts with your credits.');
      return;
    }

    const TEXT_TO_PROMPT_COST = 2;
    if (toolCredits < TEXT_TO_PROMPT_COST) {
      setRequiredCreditsForModal(TEXT_TO_PROMPT_COST);
      setIsOutOfCreditsModalOpen(true);
      showToast(`Text to Prompt generator requires 2 credits (You have ${toolCredits}). Top up or upgrade!`);
      return;
    }

    setIsGeneratingTextPrompt(true);
    setGeneratedTextData(null);
    setIsSavedTextPrompt(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'text_to_prompt',
          idea: cleanIdea,
          lighting,
          colorGrading,
          camera,
          targetEngine,
          aspectRatio,
          customInstructions: negativeConstraints,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        // Deduct exactly 2 credits for text-to-prompt generator
        deductToolCredit(TEXT_TO_PROMPT_COST);
        setGeneratedTextData(json.data);

        // Automatically persist to user history
        const promptResult = json.data.promptText || json.data.prompt || '';
        const historyItem: AIHistoryItem = {
          id: 'txt_' + Date.now(),
          type: 'text_to_prompt',
          title: json.data.title || cleanIdea.slice(0, 45),
          promptText: promptResult,
          negativePrompt: json.data.negativePrompt || json.data.negative_prompt,
          camera: json.data.camera || camera,
          lighting: json.data.lighting || lighting,
          composition: json.data.composition,
          colorPalette: json.data.colorPalette || colorGrading,
          aspectRatio: json.data.aspectRatio || aspectRatio,
          tags: json.data.tags || [lighting, colorGrading, targetEngine],
          createdAt: Date.now(),
        };
        saveAiHistoryItem(historyItem);
        setIsSavedTextPrompt(true);

        confetti({ particleCount: 70, spread: 60, origin: { y: 0.65 } });
        showToast(`Master prompt generated! 2 credits used (${Math.max(0, toolCredits - TEXT_TO_PROMPT_COST)} remaining)`);
      } else {
        showToast(json.error || 'Failed to generate master prompt with Gemini');
      }
    } catch (err) {
      console.error('Text prompt generation error:', err);
      showToast('An error occurred during prompt generation');
    } finally {
      setIsGeneratingTextPrompt(false);
    }
  };

  const handleSaveTextPromptToHistory = () => {
    if (!generatedTextData) return;
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to save prompts.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'txt_' + Date.now(),
      type: 'text_to_prompt',
      title: generatedTextData.title || textIdea.slice(0, 45),
      promptText: generatedTextData.promptText || generatedTextData.prompt || '',
      negativePrompt: generatedTextData.negativePrompt,
      camera: generatedTextData.camera || camera,
      lighting: generatedTextData.lighting || lighting,
      composition: generatedTextData.composition,
      colorPalette: generatedTextData.colorPalette || colorGrading,
      aspectRatio: generatedTextData.aspectRatio || aspectRatio,
      tags: generatedTextData.tags || [lighting, colorGrading, targetEngine],
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedTextPrompt(true);
    showToast('Saved to your AI Studio History!');
  };

  // ==========================================
  // HANDLER: IMAGE TO PROMPT (3 Credits)
  // ==========================================
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
      setExtractedImageData(null);
      setIsSavedImageExtracted(false);
      showToast('Image loaded! Click "Extract AI Prompt" to analyze.');
    };
    reader.readAsDataURL(file);
  };

  const handleExtractImagePrompt = async () => {
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to use the AI Reverse-Engineering tool.');
      return;
    }

    if (!uploadedImage) {
      showToast('Please upload or select an image first');
      return;
    }

    const IMAGE_TO_PROMPT_COST = 3;
    if (toolCredits < IMAGE_TO_PROMPT_COST) {
      setRequiredCreditsForModal(IMAGE_TO_PROMPT_COST);
      setIsOutOfCreditsModalOpen(true);
      showToast(`Image-to-prompt requires 3 credits (You have ${toolCredits}). Top up credits or upgrade!`);
      return;
    }

    setIsExtractingImagePrompt(true);
    setExtractedImageData(null);
    setIsSavedImageExtracted(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'image_to_prompt',
          image: uploadedImage,
          customInstructions: imageInstructions,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        deductToolCredit(IMAGE_TO_PROMPT_COST);
        setExtractedImageData(json.data);

        const historyItem: AIHistoryItem = {
          id: 'ext_' + Date.now(),
          type: 'image_to_prompt',
          title: json.data.title || 'Extracted Studio Prompt',
          promptText: json.data.promptText || json.data.prompt || '',
          negativePrompt: json.data.negativePrompt,
          referenceImageUrl: uploadedImage || undefined,
          camera: json.data.camera,
          lighting: json.data.lighting,
          composition: json.data.composition,
          colorPalette: json.data.colorPalette,
          aspectRatio: json.data.aspectRatio || '16:9',
          tags: json.data.tags,
          createdAt: Date.now(),
        };
        saveAiHistoryItem(historyItem);
        setIsSavedImageExtracted(true);

        confetti({ particleCount: 70, spread: 60, origin: { y: 0.65 } });
        showToast(`Prompt reverse-engineered! 3 credits used (${Math.max(0, toolCredits - IMAGE_TO_PROMPT_COST)} left)`);
      } else {
        showToast(json.error || 'Failed to extract prompt from image');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      showToast('An error occurred during prompt extraction');
    } finally {
      setIsExtractingImagePrompt(false);
    }
  };

  const handleSaveImageExtractedToHistory = () => {
    if (!extractedImageData) return;
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to save extracted prompts.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'ext_' + Date.now(),
      type: 'image_to_prompt',
      title: extractedImageData.title || 'Extracted Studio Prompt',
      promptText: extractedImageData.promptText || extractedImageData.prompt || '',
      negativePrompt: extractedImageData.negativePrompt,
      referenceImageUrl: uploadedImage || undefined,
      camera: extractedImageData.camera,
      lighting: extractedImageData.lighting,
      composition: extractedImageData.composition,
      colorPalette: extractedImageData.colorPalette,
      aspectRatio: extractedImageData.aspectRatio || '16:9',
      tags: extractedImageData.tags,
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedImageExtracted(true);
    showToast('Saved to your AI Studio History!');
  };

  // ==========================================
  // HANDLER: PROMPT ENHANCER (1 Credit)
  // ==========================================
  const handleEnhancePrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPrompt = basicPrompt.trim();
    if (!cleanPrompt) {
      showToast('Please enter a basic prompt to enhance');
      return;
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in to enhance prompts with your credits.');
      return;
    }

    const ENHANCE_COST = 1;
    if (toolCredits < ENHANCE_COST) {
      setRequiredCreditsForModal(ENHANCE_COST);
      setIsOutOfCreditsModalOpen(true);
      showToast(`Prompt Enhancer requires 1 credit (You have ${toolCredits}). Top up or upgrade!`);
      return;
    }

    setIsEnhancing(true);
    setEnhancedData(null);
    setIsSavedEnhanced(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prompt_enhancer',
          idea: cleanPrompt,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        deductToolCredit(ENHANCE_COST);
        setEnhancedData(json.data);

        const historyItem: AIHistoryItem = {
          id: 'enh_' + Date.now(),
          type: 'text_to_prompt',
          title: json.data.title || 'Enhanced Prompt',
          promptText: json.data.promptText || json.data.prompt || '',
          negativePrompt: json.data.negativePrompt,
          camera: json.data.camera,
          lighting: json.data.lighting,
          composition: json.data.composition,
          colorPalette: json.data.colorPalette,
          aspectRatio: json.data.aspectRatio || '16:9',
          tags: json.data.tags || ['Enhanced'],
          createdAt: Date.now(),
        };
        saveAiHistoryItem(historyItem);
        setIsSavedEnhanced(true);

        confetti({ particleCount: 70, spread: 60, origin: { y: 0.65 } });
        showToast(`Prompt enhanced! 1 credit used (${Math.max(0, toolCredits - ENHANCE_COST)} remaining)`);
      } else {
        showToast(json.error || 'Failed to enhance prompt with Gemini');
      }
    } catch (err) {
      console.error('Enhancer error:', err);
      showToast('An error occurred during prompt enhancement');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveEnhancedToHistory = () => {
    if (!enhancedData) return;
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to save prompts.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'enh_' + Date.now(),
      type: 'text_to_prompt',
      title: enhancedData.title || 'Enhanced Prompt',
      promptText: enhancedData.promptText || enhancedData.prompt || '',
      negativePrompt: enhancedData.negativePrompt,
      camera: enhancedData.camera,
      lighting: enhancedData.lighting,
      composition: enhancedData.composition,
      colorPalette: enhancedData.colorPalette,
      aspectRatio: enhancedData.aspectRatio || '16:9',
      tags: enhancedData.tags || ['Enhanced'],
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedEnhanced(true);
    showToast('Saved to your AI Studio History!');
  };

  // ==========================================
  // HANDLER: PROMPT EDITOR (1 Credit)
  // ==========================================
  const handleEditPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPrompt = editorOriginalPrompt.trim();
    const cleanInstructions = editorInstructions.trim();
    if (!cleanPrompt || !cleanInstructions) {
      showToast('Please provide both an original prompt and edit instructions.');
      return;
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in to edit prompts with your credits.');
      return;
    }

    const EDIT_COST = 1;
    if (toolCredits < EDIT_COST) {
      setRequiredCreditsForModal(EDIT_COST);
      setIsOutOfCreditsModalOpen(true);
      showToast(`Prompt Editor requires 1 credit (You have ${toolCredits}). Top up or upgrade!`);
      return;
    }

    setIsEditing(true);
    setEditedData(null);
    setIsSavedEdited(false);

    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prompt_editor',
          text: cleanPrompt,
          editInstruction: cleanInstructions,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        deductToolCredit(EDIT_COST);
        setEditedData(json.data);

        const historyItem: AIHistoryItem = {
          id: 'edit_' + Date.now(),
          type: 'text_to_prompt',
          title: json.data.title || 'Edited Prompt',
          promptText: json.data.promptText || json.data.prompt || '',
          tags: json.data.tags || ['Edited'],
          createdAt: Date.now(),
        };
        saveAiHistoryItem(historyItem);
        setIsSavedEdited(true);

        confetti({ particleCount: 70, spread: 60, origin: { y: 0.65 } });
        showToast(`Prompt edited! 1 credit used (${Math.max(0, toolCredits - EDIT_COST)} remaining)`);
      } else {
        showToast(json.error || 'Failed to edit prompt with Gemini');
      }
    } catch (err) {
      console.error('Editor error:', err);
      showToast('An error occurred during prompt editing');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveEditedToHistory = () => {
    if (!editedData) return;
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to save prompts.');
      return;
    }

    const historyItem: AIHistoryItem = {
      id: 'edit_' + Date.now(),
      type: 'text_to_prompt',
      title: editedData.title || 'Edited Prompt',
      promptText: editedData.promptText || editedData.prompt || '',
      tags: editedData.tags || ['Edited'],
      createdAt: Date.now(),
    };

    saveAiHistoryItem(historyItem);
    setIsSavedEdited(true);
    showToast('Saved to your AI Studio History!');
  };

  // Strict Login Gate: Unauthenticated users cannot use or see tool workspace
  if (!userAccount?.isLoggedIn) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-[#fafafa] dark:bg-neutral-950">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#E60023] text-white flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white">
              Sign In to Access AI Studio
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Text-to-Prompt generator and Image Reverse-Engineering tools require an active account. Sign in or register to get started with your daily free credits.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const currentTarget = window.location.pathname + window.location.search;
                  sessionStorage.setItem('pending_auth_redirect', currentTarget);
                  localStorage.setItem('pending_auth_redirect', currentTarget);
                }
                openAuthModal('Sign in to access the AI Studio Creation Tools.');
              }}
              className="w-full py-3.5 px-6 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-sm font-bold shadow-lg shadow-red-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sign In / Create Free Account</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-6 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Home Feed
            </button>
          </div>
        </div>
      </main>
    );
  }

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
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Tool Credits Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-xs">
              <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{toolCredits} Credits</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hidden sm:inline">
                • {activeTool === 'text_to_prompt' ? '2 cr / generation' : activeTool === 'image_to_prompt' ? '3 cr / extraction' : '1 cr / enhancement'}
              </span>
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
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#E60023]" />
              <span>View History</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#E60023] text-xs font-black">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>AI Studio Lab</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Tool Page Title & Tool Switcher Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-[#E60023]" />
              <span>AI Studio Tools</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {activeTool === 'text_to_prompt'
                ? 'Turn 1-line ideas into cinematic master prompts with custom camera optics & lighting (2 credits).'
                : activeTool === 'image_to_prompt'
                ? 'Reverse-engineer precise, high-fidelity AI prompts from any photo with optical analysis (3 credits).'
                : activeTool === 'prompt_enhancer'
                ? 'Enhance and refine a basic prompt into a highly detailed, professional prompt (1 credit).'
                : 'Modify and iterate on existing prompts with precise instructions (1 credit).'}
            </p>
          </div>

          {/* Primary Tool Switcher Tabs */}
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTool('text_to_prompt')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTool === 'text_to_prompt'
                  ? 'bg-[#E60023] text-white shadow-md shadow-red-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              id="tool-tab-text-to-prompt"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Text to Prompt</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTool === 'text_to_prompt'
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                2 Credits
              </span>
            </button>

            <button
              onClick={() => setActiveTool('image_to_prompt')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTool === 'image_to_prompt'
                  ? 'bg-[#E60023] text-white shadow-md shadow-red-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              id="tool-tab-image-to-prompt"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Image to Prompt</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTool === 'image_to_prompt'
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                3 Credits
              </span>
            </button>

            <button
              onClick={() => setActiveTool('prompt_enhancer')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTool === 'prompt_enhancer'
                  ? 'bg-[#E60023] text-white shadow-md shadow-red-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              id="tool-tab-prompt-enhancer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompt Enhancer</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTool === 'prompt_enhancer'
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                1 Credit
              </span>
            </button>

            <button
              onClick={() => setActiveTool('prompt_editor')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTool === 'prompt_editor'
                  ? 'bg-[#E60023] text-white shadow-md shadow-red-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              id="tool-tab-prompt-editor"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Prompt Editor</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTool === 'prompt_editor'
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                1 Credit
              </span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TOOL 1: TEXT TO PROMPT GENERATOR (2 Credits)                     */}
        {/* ================================================================ */}
        {activeTool === 'text_to_prompt' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Text Input & Photographic Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleGenerateTextPrompt} className="space-y-6">
                {/* Text Idea Input Card */}
                <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#E60023]" />
                      <span>Photo Prompt Concept</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {preloadedFromHome && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-[10px] font-bold border border-red-200 dark:border-red-900">
                          ✨ Pre-filled from Home
                        </span>
                      )}
                      {textIdea && (
                        <button
                          type="button"
                          onClick={() => {
                            setTextIdea('');
                            setPreloadedFromHome(false);
                            setGeneratedTextData(null);
                          }}
                          className="text-xs font-semibold text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Describe your photo or artistic vision in 1 line or a few details:
                    </label>
                    <textarea
                      rows={4}
                      value={textIdea}
                      onChange={(e) => setTextIdea(e.target.value)}
                      placeholder="e.g. Cyberpunk samurai walking in rainy neon Tokyo street, editorial photography, moody reflection on wet pavement..."
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all shadow-inner"
                      id="text-to-prompt-input"
                    />
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                      <span>{textIdea.trim().length} characters</span>
                      <span>⚡ Consumes 2 Credits</span>
                    </div>
                  </div>

                  {/* Sample Inspiration Chips */}
                  <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Quick Inspiration Ideas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {TEXT_PROMPT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setTextIdea(preset);
                            setPreloadedFromHome(false);
                          }}
                          className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer text-left"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Photographic Fine-Tuning Controls */}
                <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#E60023]" />
                      <span>Photographic Parameters</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedTextOptions(!showAdvancedTextOptions)}
                      className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showAdvancedTextOptions ? 'Collapse' : 'Customize'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          showAdvancedTextOptions ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Quick summary line when collapsed */}
                  {!showAdvancedTextOptions && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                        💡 {lighting}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                        🎨 {colorGrading}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                        📸 {camera.split(',')[0]}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                        📐 {aspectRatio}
                      </span>
                    </div>
                  )}

                  {/* Collapsible Full Controls */}
                  {showAdvancedTextOptions && (
                    <div className="space-y-3 pt-2 animate-fade-in">
                      {/* Lighting */}
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                          Lighting Dynamics
                        </label>
                        <select
                          value={lighting}
                          onChange={(e) => setLighting(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                        >
                          {LIGHTING_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Color Grading */}
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                          Color Palette & Film Stock
                        </label>
                        <select
                          value={colorGrading}
                          onChange={(e) => setColorGrading(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                        >
                          {COLOR_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Camera Optics */}
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                          Camera Optics & Prime Lens
                        </label>
                        <select
                          value={camera}
                          onChange={(e) => setCamera(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                        >
                          {CAMERA_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Target Engine & Aspect Ratio Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                            Target AI Generator
                          </label>
                          <select
                            value={targetEngine}
                            onChange={(e) => setTargetEngine(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                          >
                            {ENGINE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                            Aspect Ratio
                          </label>
                          <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                          >
                            {RATIO_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Custom Exclusions / Negative Rules */}
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                          Custom Exclusions or Style Rules (Optional)
                        </label>
                        <input
                          type="text"
                          value={negativeConstraints}
                          onChange={(e) => setNegativeConstraints(e.target.value)}
                          placeholder="e.g. no watermark, no text, clean bokeh, high contrast"
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Master Prompt CTA (2 Credits) */}
                <div className="p-4 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Available Credits:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {toolCredits} Credits
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingTextPrompt || !textIdea.trim()}
                    className="w-full py-4 px-6 rounded-full bg-[#E60023] hover:bg-[#ad081b] active:scale-[0.98] text-white font-black text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    id="generate-master-prompt-btn"
                  >
                    {isGeneratingTextPrompt ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Crafting Master Prompt with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Master Prompt (2 Credits)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
                    ⚡ Deducts 2 credits • Formulated for {targetEngine}
                  </p>
                </div>
              </form>
            </div>

            {/* Right Column: Generated Master Prompt Output (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {generatedTextData ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 animate-fade-in">
                  {/* Top Bar with Title and Actions */}
                  <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                          {generatedTextData.title || 'Generated Master Prompt'}
                        </h2>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Crafted for {targetEngine} • {aspectRatio} Aspect Ratio
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveTextPromptToHistory}
                        disabled={isSavedTextPrompt}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSavedTextPrompt
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {isSavedTextPrompt ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        <span>{isSavedTextPrompt ? 'Saved in History' : 'Save to History'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            generatedTextData.promptText || generatedTextData.prompt || '',
                            'main_text_prompt',
                            'Master prompt copied!'
                          )
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        {copiedKey === 'main_text_prompt' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'main_text_prompt' ? 'Copied!' : 'Copy Master Prompt'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Master Prompt Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#E60023]" />
                        <span>Master AI Image Prompt</span>
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            generatedTextData.promptText || generatedTextData.prompt || '',
                            'main_text_prompt',
                            'Master prompt copied!'
                          )
                        }
                        className="text-xs text-[#E60023] hover:underline font-bold"
                      >
                        {copiedKey === 'main_text_prompt' ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 text-neutral-100 font-mono text-xs sm:text-sm leading-relaxed border border-neutral-800 shadow-inner relative group">
                      <p className="whitespace-pre-wrap select-all selection:bg-red-600 selection:text-white">
                        {generatedTextData.promptText || generatedTextData.prompt}
                      </p>
                    </div>
                  </div>

                  {/* Negative Prompt Box */}
                  {(generatedTextData.negativePrompt || generatedTextData.negative_prompt) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">
                          Negative Prompt (Exclusions)
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              generatedTextData.negativePrompt || generatedTextData.negative_prompt || '',
                              'neg_text_prompt',
                              'Negative prompt copied!'
                            )
                          }
                          className="text-xs text-[#E60023] hover:underline font-bold"
                        >
                          {copiedKey === 'neg_text_prompt' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-xs leading-relaxed border border-neutral-200 dark:border-neutral-700">
                        {generatedTextData.negativePrompt || generatedTextData.negative_prompt}
                      </div>
                    </div>
                  )}

                  {/* Photographic Optical Breakdown */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                      Photographic Optics Breakdown
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {generatedTextData.camera && (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase block">Camera & Optics</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            📸 {generatedTextData.camera}
                          </span>
                        </div>
                      )}
                      {generatedTextData.lighting && (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase block">Lighting Style</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            💡 {generatedTextData.lighting}
                          </span>
                        </div>
                      )}
                      {generatedTextData.colorPalette && (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase block">Color & Film</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            🎨 {generatedTextData.colorPalette}
                          </span>
                        </div>
                      )}
                      {generatedTextData.composition && (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase block">Composition</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            📐 {generatedTextData.composition}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action row at bottom */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      ↑ Back to Top
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTextIdea('');
                        setGeneratedTextData(null);
                        setPreloadedFromHome(false);
                      }}
                      className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition-colors"
                    >
                      Create Another Prompt
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty / Waiting State */
                <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm text-center space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                      Ready to Craft Master Prompts
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Enter your prompt idea on the left and click <strong>Generate Master Prompt (2 Credits)</strong>. Gemini will expand it into a production-ready prompt complete with real camera settings, prime lens optics, lighting direction, and negative keywords.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] font-bold text-[#E60023] block mb-1">⚡ 2 Credits</span>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Economical consumption with high-fidelity Gemini 3 expansion.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] font-bold text-[#E60023] block mb-1">📸 Real Optics</span>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Incorporate Hasselblad, Leica, and Sony A7R V focal lengths.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] font-bold text-[#E60023] block mb-1">🎯 Multi-Engine</span>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Outputs tuned flags for Midjourney, Flux, and Imagen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TOOL 2: IMAGE TO PROMPT STUDIO (3 Credits)                       */}
        {/* ================================================================ */}
        {activeTool === 'image_to_prompt' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Image Upload & Custom Rules (5 cols) */}
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
                        setExtractedImageData(null);
                        setIsSavedImageExtracted(false);
                      }}
                      className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
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
                        className="px-3.5 py-1.5 rounded-full bg-white text-neutral-900 text-xs font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 cursor-pointer"
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
                    <span className="text-[11px] text-neutral-400 mt-1">PNG, JPG, WebP up to 10MB</span>
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
                          setExtractedImageData(null);
                          setIsSavedImageExtracted(false);
                        }}
                        className="group relative rounded-xl overflow-hidden aspect-square border border-neutral-200 dark:border-neutral-700 hover:ring-2 hover:ring-[#E60023] transition-all cursor-pointer"
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
                    value={imageInstructions}
                    onChange={(e) => setImageInstructions(e.target.value)}
                    placeholder="remove watermark, focus on portrait lighting, 200 words minimum..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all"
                  />
                </div>
              </div>

              {/* Action Button (3 Credits) */}
              <div className="p-4 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Available Balance:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{toolCredits} Credits</span>
                </div>
                <button
                  onClick={handleExtractImagePrompt}
                  disabled={isExtractingImagePrompt || !uploadedImage}
                  className="w-full py-4 px-6 rounded-full bg-[#E60023] hover:bg-[#ad081b] active:scale-[0.98] text-white font-black text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  id="extract-image-prompt-btn"
                >
                  {isExtractingImagePrompt ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Visual DNA with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Extract AI Prompt (3 Credits)</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
                  🖼️ Deducts 3 credits • Multimodal optical analysis
                </p>
              </div>
            </div>

            {/* Right Column: Extracted Image Prompt (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {extractedImageData ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 animate-fade-in">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                          {extractedImageData.title || 'Extracted Studio Prompt'}
                        </h2>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Reverse-engineered optical DNA from uploaded photo
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveImageExtractedToHistory}
                        disabled={isSavedImageExtracted}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSavedImageExtracted
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {isSavedImageExtracted ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        <span>{isSavedImageExtracted ? 'Saved in History' : 'Save to History'}</span>
                      </button>

                      <button
                        onClick={() =>
                          copyToClipboard(
                            extractedImageData.promptText || extractedImageData.prompt || '',
                            'main_img_prompt',
                            'Master prompt copied!'
                          )
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        {copiedKey === 'main_img_prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'main_img_prompt' ? 'Copied!' : 'Copy Prompt'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Prompt Box */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E60023]" />
                      <span>Reverse-Engineered Prompt Text</span>
                    </span>
                    <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 text-neutral-100 font-mono text-xs sm:text-sm leading-relaxed border border-neutral-800 shadow-inner">
                      <p className="whitespace-pre-wrap select-all selection:bg-red-600 selection:text-white">
                        {extractedImageData.promptText || extractedImageData.prompt}
                      </p>
                    </div>
                  </div>

                  {/* Negative Prompt */}
                  {(extractedImageData.negativePrompt || extractedImageData.negative_prompt) && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Negative Prompt (Tokens)
                      </span>
                      <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-xs leading-relaxed">
                        {extractedImageData.negativePrompt || extractedImageData.negative_prompt}
                      </div>
                    </div>
                  )}

                  {/* Micro Breakdown Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    {extractedImageData.camera && (
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">Camera Optics</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          📸 {extractedImageData.camera}
                        </span>
                      </div>
                    )}
                    {extractedImageData.lighting && (
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">Lighting Style</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          💡 {extractedImageData.lighting}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty Image State */
                <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm text-center space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                      Upload an Image to Extract Prompt
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Upload any artwork, photograph, or render on the left to extract its exact prompt structure, composition rules, and photographic parameters.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TOOL 3: PROMPT ENHANCER (1 Credit)                               */}
        {/* ================================================================ */}
        {activeTool === 'prompt_enhancer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Basic Prompt Input */}
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleEnhancePrompt} className="space-y-6">
                <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#E60023]" />
                      <span>Basic Prompt</span>
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Paste a basic or weak prompt to enhance it:
                    </label>
                    <textarea
                      rows={6}
                      value={basicPrompt}
                      onChange={(e) => setBasicPrompt(e.target.value)}
                      placeholder="e.g. A cat sitting on a table..."
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all shadow-inner"
                      id="prompt-enhancer-input"
                    />
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                      <span>{basicPrompt.trim().length} characters</span>
                      <span>⚡ Consumes 1 Credit</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Available Credits:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {toolCredits} Credits
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isEnhancing || !basicPrompt.trim()}
                    className="w-full py-4 px-6 rounded-full bg-[#E60023] hover:bg-[#ad081b] active:scale-[0.98] text-white font-black text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isEnhancing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enhancing Prompt...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Enhance Prompt (1 Credit)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
                    ⚡ Deducts 1 credit • Expands with professional details
                  </p>
                </div>
              </form>
            </div>

            {/* Right Column: Enhanced Output */}
            <div className="lg:col-span-7 space-y-6">
              {enhancedData ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                          {enhancedData.title || 'Enhanced Prompt'}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEnhancedToHistory}
                        disabled={isSavedEnhanced}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSavedEnhanced
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {isSavedEnhanced ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        <span>{isSavedEnhanced ? 'Saved' : 'Save'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            enhancedData.promptText || enhancedData.prompt || '',
                            'enh_prompt',
                            'Enhanced prompt copied!'
                          )
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        {copiedKey === 'enh_prompt' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'enh_prompt' ? 'Copied!' : 'Copy Prompt'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-amber-500/5 rounded-2xl pointer-events-none" />
                      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 shadow-inner">
                        <p className="text-sm sm:text-base text-neutral-900 dark:text-white leading-relaxed font-mono select-all">
                          {enhancedData.promptText || enhancedData.prompt}
                        </p>
                      </div>
                    </div>

                    {(enhancedData.negativePrompt || enhancedData.negative_prompt) && (
                      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                        <h4 className="text-xs font-black text-red-600 dark:text-red-400 mb-1.5 uppercase tracking-wider">
                          Negative Parameters
                        </h4>
                        <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 font-mono leading-relaxed select-all">
                          {enhancedData.negativePrompt || enhancedData.negative_prompt}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-neutral-900/20">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-4">
                    <Wand2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-2">
                    Professional Prompt Enhancer
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Enter a basic prompt on the left and our AI will expand it into a detailed, high-quality prompt suitable for advanced image generators.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TOOL 4: PROMPT EDITOR (1 Credit)                                 */}
        {/* ================================================================ */}
        {activeTool === 'prompt_editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Editor Inputs */}
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleEditPrompt} className="space-y-6">
                <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-[#E60023]" />
                      <span>Original Prompt & Edits</span>
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Original Prompt:
                      </label>
                      <textarea
                        rows={4}
                        value={editorOriginalPrompt}
                        onChange={(e) => setEditorOriginalPrompt(e.target.value)}
                        placeholder="Paste the prompt you want to modify..."
                        className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                        What to change?
                      </label>
                      <textarea
                        rows={3}
                        value={editorInstructions}
                        onChange={(e) => setEditorInstructions(e.target.value)}
                        placeholder="e.g. Change the lighting to cinematic, make it cyberpunk style, etc."
                        className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-[#E60023] focus:outline-none resize-none leading-relaxed transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Available Credits:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {toolCredits} Credits
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isEditing || !editorOriginalPrompt.trim() || !editorInstructions.trim()}
                    className="w-full py-4 px-6 rounded-full bg-[#E60023] hover:bg-[#ad081b] active:scale-[0.98] text-white font-black text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isEditing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Editing Prompt...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Edit Prompt (1 Credit)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Edited Output */}
            <div className="lg:col-span-7 space-y-6">
              {editedData ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E60023] animate-pulse" />
                        <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                          {editedData.title || 'Edited Prompt'}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEditedToHistory}
                        disabled={isSavedEdited}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSavedEdited
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {isSavedEdited ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        <span>{isSavedEdited ? 'Saved' : 'Save'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            editedData.promptText || editedData.prompt || '',
                            'edit_prompt',
                            'Edited prompt copied!'
                          )
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        {copiedKey === 'edit_prompt' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'edit_prompt' ? 'Copied!' : 'Copy Prompt'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-amber-500/5 rounded-2xl pointer-events-none" />
                      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 shadow-inner">
                        <p className="text-sm sm:text-base text-neutral-900 dark:text-white leading-relaxed font-mono select-all">
                          {editedData.promptText || editedData.prompt}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-neutral-900/20">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-4">
                    <Wand2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-2">
                    Professional Prompt Editor
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Enter an existing prompt and tell our AI what changes you want to make. It will rewrite the prompt professionally.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OUT OF CREDITS MODAL */}
      {isOutOfCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl text-center space-y-5 relative">
            <button
              onClick={() => setIsOutOfCreditsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
              <Coins className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                Out of Tool Credits
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {requiredCreditsForModal === 2 ? 'Text-to-prompt generator' : 'Image-to-prompt extraction'} requires{' '}
                <strong className="text-neutral-900 dark:text-white">{requiredCreditsForModal} credits</strong>. You currently have{' '}
                <strong className="text-[#E60023]">{toolCredits} credits</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-left space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Pay-As-You-Go Credits:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                <li>• <strong>100 Credits (₹49)</strong>: 50 text-to-prompt generations</li>
                <li>• <strong>250 Credits (₹99)</strong>: 125 text-to-prompt generations (Most Popular)</li>
                <li>• <strong>499 Credits (₹199)</strong>: 250 text-to-prompt generations (Best Value)</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setIsOutOfCreditsModalOpen(false);
                  router.push('/pricing');
                }}
                className="w-full py-3 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-black shadow-md shadow-red-500/20 transition-all cursor-pointer"
              >
                View Pricing Plans & Top Up
              </button>
              <button
                onClick={() => setIsOutOfCreditsModalOpen(false)}
                className="w-full py-2.5 rounded-full text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Wait for Daily Free Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
