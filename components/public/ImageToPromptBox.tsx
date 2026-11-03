'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UploadCloud, Wand2, Sparkles, X, Image as ImageIcon, Camera, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const SAMPLE_TEST_IMAGES = [
  {
    name: 'Editorial Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Cinematic Fashion',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Minimalist Architecture',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Golden Hour Aesthetic',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  },
];

export const ImageToPromptBox = () => {
  const router = useRouter();
  const { showToast, userAccount, openAuthModal, posts } = useApp();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use top post images as sample images if available
  const sampleImages = React.useMemo(() => {
    const valid = (posts || []).filter(
      (p) => p.imageUrl && p.imageUrl.startsWith('https://') && !p.imageUrl.startsWith('data:')
    );
    if (valid.length >= 4) {
      return valid.slice(0, 4).map((p) => ({
        name: p.title || 'Aesthetic Sample',
        url: p.imageUrl,
      }));
    }
    return SAMPLE_TEST_IMAGES;
  }, [posts]);

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast('Image size exceeds 12MB limit. Please upload a smaller photo.');
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedImage(result);
        showToast('Image loaded! Click "Generate Prompt" to continue.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleGeneratePromptClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!selectedImage) {
      showToast('Please upload an image first.');
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Save image to session storage for the studio tool
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('promptcms_studio_image_preload', selectedImage);
        sessionStorage.setItem('auraprompt_studio_image_preload', selectedImage);
        sessionStorage.setItem('promptcms_studio_tab', 'reverse');
        sessionStorage.setItem('promptcms_auto_extract', 'true');
      } catch (err) {
        console.warn('Session storage quota warning:', err);
      }
    }

    // Requirement: "is feature me image upload kar lo homepage per generate prompt button per click karte hi login signup popup show kro"
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to generate prompts from your uploaded photo.');
      return;
    }

    // If user is already logged in, redirect directly to image to prompt studio
    showToast('Redirecting to Image to Prompt Studio...');
    router.push('/create');
  };

  const handleSelectSample = async (url: string, name: string) => {
    setImageName(name);
    setSelectedImage(url);
    showToast(`Loaded "${name}". Click "Generate Prompt" to continue.`);
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 text-left" id="homepage-image-to-prompt-box">
      <div className="relative rounded-3xl bg-white dark:bg-neutral-900/95 p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-neutral-200/50 dark:shadow-black/60 transition-all space-y-4 backdrop-blur-md">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E60023] to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>AI Image to Prompt</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] border border-red-200 dark:border-red-900/50 uppercase tracking-wide">
                  Free
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Upload any photo to reverse-engineer its exact prompt, camera gear, lighting & aesthetic.
              </p>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        {/* Upload Zone / Image Preview */}
        {!selectedImage ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-6 sm:p-8 flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-[#E60023] bg-red-500/5 dark:bg-red-500/10 scale-[0.99]'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-[#E60023]/60 bg-neutral-50/70 dark:bg-neutral-850/50 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6 text-[#E60023]" />
            </div>
            <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
              Drop photo here or <span className="text-[#E60023] underline decoration-[#E60023]/40 underline-offset-2">click to browse</span>
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Supports JPG, PNG, WEBP up to 12MB
            </p>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
            {/* Image Preview Container */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-900 shadow-sm">
              <img
                src={selectedImage}
                alt="Selected upload"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Image Info & Action */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 mb-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Photo Ready for Analysis</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate" title={imageName || 'Uploaded Photo'}>
                {imageName || 'Custom Uploaded Photo'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Our vision AI will reverse-engineer the prompt text, style tags, lighting, camera model & aspect ratio.
              </p>
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls & Sample Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Sample Photos */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-neutral-400 whitespace-nowrap hidden sm:inline">
              Or test with:
            </span>
            <div className="flex items-center gap-1.5">
              {sampleImages.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(s.url, s.name)}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-750 text-neutral-700 dark:text-neutral-300 text-xs font-medium whitespace-nowrap transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-md overflow-hidden relative shrink-0">
                    <img src={s.url} alt={s.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="truncate max-w-[100px]">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Generate Button */}
          <button
            type="button"
            onClick={handleGeneratePromptClick}
            id="homepage-generate-prompt-btn"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-sm font-black flex items-center justify-center gap-2.5 shadow-lg shadow-red-500/25 transition-all transform active:scale-95 cursor-pointer shrink-0"
          >
            <Wand2 className="w-4 h-4 animate-pulse" />
            <span>Generate Prompt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
