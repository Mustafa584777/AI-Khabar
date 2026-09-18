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

    const redirectPath = `/create?idea=${encodeURIComponent(cleanIdea)}`;

    // Persist pending prompt text into both sessionStorage and localStorage for guaranteed handoff
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('pending_text_to_prompt', cleanIdea);
        sessionStorage.setItem('promptcms_studio_preload', cleanIdea);
        sessionStorage.setItem('auraprompt_studio_preload', cleanIdea);
        localStorage.setItem('pending_text_to_prompt', cleanIdea);

        sessionStorage.setItem('pending_auth_redirect', redirectPath);
        localStorage.setItem('pending_auth_redirect', redirectPath);
      } catch (err) {
        console.warn('Storage persistence notice:', err);
      }
    }

    // If user is not logged in, trigger login popup immediately
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create a free account to generate master prompts with your daily credits.');
      return;
    }

    // If already logged in, redirect directly to create page with prompt pre-filled
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('pending_auth_redirect');
        localStorage.removeItem('pending_auth_redirect');
      } catch {}
    }
    showToast('Opening prompt generator studio...');
    router.push(redirectPath);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-4 text-left" id="gemini-prompt-generator-box">
      <form onSubmit={handleGenerate} className="relative flex items-center shadow-md hover:shadow-lg rounded-full transition-all group">
        <input
          type="text"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Enter your photo prompt idea (e.g. Cyberpunk samurai in rainy neon Tokyo)..."
          className="w-full pl-5 pr-28 sm:pr-36 py-3.5 sm:py-4 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] transition-all"
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
      </form>
    </div>
  );
};
