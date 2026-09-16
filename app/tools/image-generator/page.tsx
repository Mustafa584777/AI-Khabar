'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { BottomNav } from '@/components/public/BottomNav';
import { ToastNotification } from '@/components/public/ToastNotification';
import { Sparkles, Upload, Image as ImageIcon, Download, Loader2, X } from 'lucide-react';

function ImageGeneratorContent() {
  const { showToast } = useApp();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageBase64: uploadedImage }),
      });

      const data = await res.json();

      if (res.ok && data.image) {
        setGeneratedImage(data.image);
        showToast('Image generated successfully!');
      } else {
        showToast(data.error || 'Failed to generate image. Please try again.');
      }
    } catch (error) {
      console.error('Generation error:', error);
      showToast('An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col pb-20 sm:pb-8">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            AI Image Generator
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            Transform your ideas into stunning visuals. Upload a reference image (optional) and describe what you want to create.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col gap-6">
            
            {/* Image Upload Area */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Reference Image (Optional)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer min-h-[200px] ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
                onClick={() => !uploadedImage && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                  }}
                />
                
                {uploadedImage ? (
                  <div className="relative w-full h-full min-h-[200px] flex items-center justify-center">
                    <img 
                      src={uploadedImage} 
                      alt="Reference" 
                      className="max-w-full max-h-[300px] object-contain rounded-lg"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-neutral-500 dark:text-neutral-400">
                    <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                      <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Click or drag & drop an image
                    </p>
                    <p className="text-xs mt-1">JPEG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate in detail..."
                className="w-full h-32 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-none resize-none focus:ring-2 focus:ring-blue-500 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>

          {/* Output Section */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Result
              </h2>
              {generatedImage && (
                <button
                  onClick={handleDownload}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>

            <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center overflow-hidden relative">
              {isGenerating ? (
                <div className="flex flex-col items-center text-blue-600 dark:text-blue-400 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="text-sm font-medium animate-pulse">Crafting your vision...</p>
                </div>
              ) : generatedImage ? (
                <img 
                  src={generatedImage} 
                  alt="Generated AI Result" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-neutral-400 dark:text-neutral-500 p-8 text-center space-y-3">
                  <ImageIcon className="w-12 h-12 opacity-50" />
                  <p className="text-sm font-medium max-w-[200px]">
                    Your generated image will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
      <ToastNotification />
    </div>
  );
}

export default function ImageGeneratorPage() {
  return (
    <AppProvider>
      <ImageGeneratorContent />
    </AppProvider>
  );
}
