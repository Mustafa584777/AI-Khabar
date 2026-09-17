'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Sparkles, HelpCircle } from 'lucide-react';
import Image from 'next/image';

export const Footer = () => {
  const {
    settings,
    categories,
    setSelectedCategory,
  } = useApp();

  return (
    <footer className="mt-16 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <Image
                  src="/logo.png"
                  alt="tool.reelz"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-base text-neutral-900 dark:text-white">
                {settings.siteName || 'Trending Copy Paste Photo Prompts'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {settings.siteTagline ||
                'The premier Pinterest-style copy-paste photo prompt directory for Midjourney, ChatGPT, Flux, and Gemini.'}
            </p>
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                Author & Curation: <span className="text-[#E60023]">tool.reelz</span>
              </span>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] mb-3">
              Popular Boards & Categories
            </h4>
            <ul className="space-y-2">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-[#E60023] transition-colors"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400">
          <p>© {new Date().getFullYear()} Trending Copy Paste Photo Prompts. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
