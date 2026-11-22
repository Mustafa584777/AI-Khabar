'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Eraser,
  Upload,
  ShieldCheck,
  WifiOff,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { startRouteNavigation } from '@/lib/navigation';
import { setWatermarkHandoff } from '@/lib/watermark-handoff';

export const GeminiWatermarkRemoverBox = () => {
  const router = useRouter();
  const { showToast } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Image size exceeds 25MB limit. Please choose a smaller photo.');
      return;
    }

    setIsRedirecting(true);
    setWatermarkHandoff({ file, name: file.name });
    showToast('Loading your photo into Gemini Watermark Remover...');
    startRouteNavigation(
      '/free-gemini-watermark-remover-online',
      'Opening Gemini Watermark Remover...'
    );
    router.push('/free-gemini-watermark-remover-online');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto my-6 text-left"
      id="homepage-gemini-watermark-remover-box"
    >
      <div className="relative rounded-3xl bg-white dark:bg-neutral-900 p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-lg shadow-neutral-200/40 dark:shadow-black/50 space-y-4">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20 shrink-0">
              <Eraser className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Gemini Watermark Remover</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-900/50 uppercase tracking-wide">
                  Free • No Login
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Upload any Gemini or AI photo to remove sparkle watermarks &amp; corner logos locally inside your browser.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Works Offline</span>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelected(file);
            }
            e.target.value = '';
          }}
        />

        {/* Instant Upload Dropzone — redirects immediately with uploaded image */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isRedirecting && fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-colors ${
            isDragging
              ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/20'
              : 'border-neutral-300 dark:border-neutral-700/80 hover:border-pink-500/70 bg-neutral-50/80 dark:bg-neutral-950/60 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-violet-600 text-white shadow-md shadow-pink-500/20 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
            {isRedirecting ? (
              <span>Opening Gemini Watermark Remover...</span>
            ) : (
              <>
                Drop Gemini photo here or{' '}
                <span className="text-pink-600 dark:text-pink-400 underline decoration-pink-500/40 underline-offset-2">
                  click to upload
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Supports JPG, PNG, WEBP · Auto-marks Gemini watermark instantly · Works without login
          </p>
        </div>

        {/* Footer Badges & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Private On-Device</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Auto-Marks Bottom-Right Logo</span>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/free-gemini-watermark-remover-online"
              onClick={() =>
                startRouteNavigation(
                  '/free-gemini-watermark-remover-online',
                  'Opening Gemini Watermark Remover...'
                )
              }
              className="px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Tool</span>
            </Link>

            <button
              type="button"
              disabled={isRedirecting}
              onClick={() => fileInputRef.current?.click()}
              id="homepage-upload-watermark-btn"
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 disabled:opacity-60 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-colors cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>{isRedirecting ? 'Redirecting...' : 'Upload Photo & Clean'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
