'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, Copy, Check } from 'lucide-react';
import Markdown from 'react-markdown';

export const GeminiPromptBox = () => {
  const { showToast, userAccount, openAuthModal, toolCredits, deductToolCredit, settings } = useApp();
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const COST = 1;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanIdea = idea.trim();
    if (!cleanIdea) {
      showToast('Please enter your photo prompt idea first.');
      return;
    }

    if (!userAccount?.isLoggedIn) {
      openAuthModal(`Please sign in or create a free account to generate prompts (${COST} credit).`);
      return;
    }

    if (toolCredits < COST) {
      showToast(`Not enough credits. You need ${COST} credit, but have ${toolCredits}.`);
      return;
    }

    setIsGenerating(true);
    setResult('');
    
    try {
      const res = await fetch('/api/gemini/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'idea_to_prompt',
          payload: {
            idea: cleanIdea,
            targetEngine: 'Midjourney v6',
            customInstructions: settings.geminiCustomInstructions || ''
          },
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        showToast(json.error || 'Failed to generate prompt');
      } else {
        deductToolCredit(COST);
        setResult(json.prompt || 'Failed to generate prompt content.');
        showToast(`Success! ${COST} credit used.`);
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    showToast('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 text-left" id="gemini-prompt-generator-box">
      <form onSubmit={handleGenerate} className="relative flex items-center shadow-md hover:shadow-lg rounded-full transition-all group">
        <input
          type="text"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Enter your photo prompt idea (e.g. Cyberpunk samurai in rainy neon Tokyo)..."
          className="w-full pl-5 pr-32 sm:pr-40 py-3.5 sm:py-4 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] transition-all"
          id="gemini-idea-input"
          disabled={isGenerating}
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-4 sm:px-5 rounded-full bg-[#E60023] hover:bg-[#ad081b] active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-70"
          id="gemini-generate-btn"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isGenerating ? 'Generating...' : `Generate (${COST} 🪙)`}</span>
        </button>
      </form>
      
      {result && (
        <div className="mt-6 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm animate-fade-in relative group">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap font-medium pr-10">
            <Markdown>{result}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
