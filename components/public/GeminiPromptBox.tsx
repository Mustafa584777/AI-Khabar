'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export const GeminiPromptBox = () => {
  const router = useRouter();
  const { showToast, userAccount, openAuthModal } = useApp();
  const [idea, setIdea] = useState('');

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanIdea = idea.trim();
    if (!cleanIdea) {
      showToast('Please enter your photo prompt idea first.');
      return;
    }

    // Persist pending prompt text into session storage so it pre-fills on /create
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_text_to_prompt', cleanIdea);
      sessionStorage.setItem('promptcms_studio_preload', cleanIdea);
      sessionStorage.setItem('auraprompt_studio_preload', cleanIdea);
      sessionStorage.setItem('pending_auth_redirect', '/create');
    }

    // Check if user is logged in
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to generate master prompts with your daily free credits.');
      return;
    }

    // If already logged in, redirect directly to create page prompt generator tool
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pending_auth_redirect');
    }
    showToast('Opening prompt generator studio...');
    router.push('/create');
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6 text-left" id="gemini-prompt-generator-box">
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all">
        {/* Header matching app design language */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#E60023]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Gemini Prompt Generator
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] border border-red-200/60 dark:border-red-900/60 hidden sm:inline-block">
                  AI Master Prompt
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Turn your 1-line photo idea into a photorealistic, studio-grade prompt
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
              ⚡ 2 Credits
            </span>
          </div>
        </div>

        {/* Form: ONLY Text input and Generate Button */}
        <form onSubmit={handleGenerate} className="mt-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Enter your photo prompt idea (e.g. Cyberpunk samurai in rainy neon Tokyo)..."
              className="w-full pl-4 pr-28 sm:pr-36 py-3.5 sm:py-4 rounded-full bg-neutral-100 dark:bg-neutral-800/90 border-0 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023]/40 transition-all shadow-inner"
              id="gemini-idea-input"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 sm:px-5 rounded-full bg-[#E60023] hover:bg-[#ad081b] active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              id="gemini-generate-btn"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
