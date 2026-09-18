'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Sparkles, Wand2 } from 'lucide-react';

export const GeminiPromptBox = () => {
  const router = useRouter();
  const { showToast, userAccount, openAuthModal } = useApp();
  const [idea, setIdea] = useState('');

  const handleGenerateClick = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdea = idea.trim();
    if (!cleanIdea) {
      showToast('Please enter a prompt idea or concept.');
      return;
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to use the Gemini Prompt Generator.');
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', cleanIdea);
      sessionStorage.setItem('auraprompt_studio_preload', cleanIdea);
    }

    showToast('Redirecting to Create Studio...');
    router.push('/create');
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-6 text-left" id="gemini-prompt-generator-box">
      <div className="relative rounded-3xl bg-white dark:bg-neutral-900 p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 shadow-xl shadow-neutral-200/50 dark:shadow-black/50 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-red-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                Gemini Prompt Generator
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] dark:text-red-400 border border-red-200 dark:border-red-900">
                1-Click Master Prompt
              </span>
            </div>
          </div>
        </div>

        {/* Form: Only Input and Generate Button */}
        <form onSubmit={handleGenerateClick} className="relative">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Enter your prompt idea (e.g. Cyberpunk samurai in rainy neon Tokyo)..."
            className="w-full pl-4 pr-32 sm:pr-36 py-3.5 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023]/50 transition-all"
            id="gemini-idea-input"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 sm:px-5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-red-500/20 transition-all cursor-pointer"
            id="gemini-generate-btn"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generate</span>
          </button>
        </form>
      </div>
    </div>
  );
};
