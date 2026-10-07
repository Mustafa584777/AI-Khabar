'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  Zap,
  Layers,
  Heart,
  Bookmark,
  Copy,
  Eye,
} from 'lucide-react';
import {
  GenderVibe,
  DEFAULT_STYLES,
  DEFAULT_TOOLS,
  INITIAL_TASTE_PROFILE,
  PersonalizationEngine,
} from '@/lib/personalization';

export const TasteProfileModal = () => {
  const {
    tasteProfile,
    updateTasteProfile,
    isTasteModalOpen,
    setIsTasteModalOpen,
    categories,
    bookmarkedIds,
  } = useApp();

  const [genderVibe, setGenderVibe] = useState<GenderVibe>(tasteProfile.genderVibe || 'all');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    tasteProfile.favoriteStyles || ['Photorealistic', 'Cinematic 8K', '3D Character']
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    tasteProfile.favoriteTools || ['Midjourney', 'ChatGPT', 'Flux']
  );

  if (!isTasteModalOpen) return null;

  const tasteSummary = PersonalizationEngine.getTasteSummary(tasteProfile);

  const genderOptions: { id: GenderVibe; label: string; icon: string; desc: string }[] = [
    {
      id: 'all',
      label: 'All Styles & Subjects',
      icon: '🌟',
      desc: 'Balanced mix of landscapes, characters, objects & styles',
    },
    {
      id: 'male',
      label: 'Male & Men’s Styling',
      icon: '🧔',
      desc: 'Focus on men’s portraits, cinematic gentlemen & masculine aesthetics',
    },
    {
      id: 'female',
      label: 'Female & Fashion',
      icon: '💃',
      desc: 'Focus on women’s portraits, fashion editorial & glamorous lighting',
    },
    {
      id: 'anime',
      label: 'Anime & Manga',
      icon: '🌸',
      desc: 'Shonen, cel-shaded characters, cyberpunk waifus & Studio Ghibli art',
    },
    {
      id: 'tech',
      label: 'Cyberpunk & Sci-Fi',
      icon: '⚡',
      desc: 'Neon lighting, futuristic cities, mecha, holograms & robots',
    },
    {
      id: 'aesthetic',
      label: 'Minimalist & Aesthetic',
      icon: '🎨',
      desc: 'Clean pastel tones, architectural minimalism & moody film grain',
    },
  ];

  const handleToggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== style));
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleToggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      if (selectedTools.length > 1) {
        setSelectedTools(selectedTools.filter((t) => t !== tool));
      }
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleSave = () => {
    updateTasteProfile({
      genderVibe,
      favoriteStyles: selectedStyles,
      favoriteTools: selectedTools,
    });
    setIsTasteModalOpen(false);
  };

  const handleReset = () => {
    setGenderVibe(INITIAL_TASTE_PROFILE.genderVibe);
    setSelectedStyles(INITIAL_TASTE_PROFILE.favoriteStyles);
    setSelectedTools(INITIAL_TASTE_PROFILE.favoriteTools);
    updateTasteProfile(INITIAL_TASTE_PROFILE);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[28px] sm:rounded-[32px] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        id="taste-profile-modal"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E60023]/10 text-[#E60023] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                Tune Your &quot;For You&quot; Feed
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Pinterest-style AI personalization powered by your actions & preferences
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTasteModalOpen(false)}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Gender / Persona Preference */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              1. Persona & Subject Focus
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {genderOptions.map((opt) => {
                const isSelected = genderVibe === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setGenderVibe(opt.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#E60023]/5 dark:bg-[#E60023]/10 border-[#E60023] ring-1 ring-[#E60023]/40'
                        : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-2xl shrink-0 select-none">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            isSelected ? 'text-[#E60023]' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {opt.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#E60023] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Aesthetic Themes & Visual Styles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                2. Favorite Aesthetics & Visual Styles
              </label>
              <span className="text-[11px] text-neutral-400 font-semibold">
                {selectedStyles.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_STYLES.map((style) => {
                const isSelected = selectedStyles.includes(style);
                return (
                  <button
                    key={style}
                    onClick={() => handleToggleStyle(style)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#E60023] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{style}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Favorite AI Tools */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                3. Primary AI Generators
              </label>
              <span className="text-[11px] text-neutral-400 font-semibold">
                {selectedTools.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TOOLS.map((tool) => {
                const isSelected = selectedTools.includes(tool);
                return (
                  <button
                    key={tool}
                    onClick={() => handleToggleTool(tool)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{tool}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Live AI Interaction Signal Tracker */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-neutral-800 dark:text-neutral-200">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto-Learned AI Activity Signals</span>
              </div>
              <span className="text-[11px] font-bold text-neutral-500">
                {bookmarkedIds.length} Saved • {Object.keys(tasteProfile.clickedPostIds).length} Viewed
              </span>
            </div>

            {tasteSummary.topCategories.length > 0 ? (
              <div className="space-y-2 text-xs">
                <div className="text-[11px] text-neutral-500 font-medium">
                  Your top engaged categories based on clicks, saves, likes & copies:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tasteSummary.topCategories.map((c) => (
                    <span
                      key={c.name}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      <span>{c.name}</span>
                      <span className="text-[#E60023] font-black">+{c.score}pts</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500 italic">
                Interact with prompts by saving, copying, or liking to automatically fine-tune your real-time recommendations.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Signals</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTasteModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md shadow-[#E60023]/25 transition-all transform active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply & Personalize Feed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
