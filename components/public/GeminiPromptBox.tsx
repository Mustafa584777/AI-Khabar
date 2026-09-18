'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Wand2 } from 'lucide-react';

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

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', cleanIdea);
      sessionStorage.setItem('auraprompt_studio_preload', cleanIdea);
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to use the Gemini Prompt Generator.');
      return;
    }

    showToast('Redirecting to Create Studio...');
    router.push('/create');
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 text-left" id="gemini-prompt-generator-box">
      <div className="relative rounded-3xl bg-white dark:bg-neutral-900 p-3 sm:p-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-neutral-200/50 dark:shadow-black/50 transition-all">
        {/* Form: Only Input and Generate Button */}
        <form onSubmit={handleGenerateClick} className="relative">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Enter your prompt idea or concept (e.g. Cyberpunk samurai in rainy neon Tokyo)..."
            className="w-full pl-5 pr-36 sm:pr-40 py-4 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-sm sm:text-base font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023]/50 transition-all"
            id="gemini-idea-input"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-6 sm:px-8 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-red-500/20 transition-all cursor-pointer"
            id="gemini-generate-btn"
          >
            <Wand2 className="w-4 h-4" />
            <span>Generate</span>
          </button>
        </form>
      </div>
    </div>
  );
};
