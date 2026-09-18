'use client';
import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Sparkles, BookOpen, HelpCircle, Coins } from 'lucide-react';
import Image from 'next/image';

export const Footer = () => {
  const {
    settings,
    categories,
    setSelectedCategory,
  } = useApp();

  return (
    <footer className="mt-16 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 text-xs pb-16 sm:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#E60023]/30 shadow-sm">
                <Image
                  src="/logo.png"
                  alt="tool.reelz"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-black text-lg text-neutral-900 dark:text-white tracking-tight">
                {settings.siteName || 'Trending Copy Paste Photo Prompts'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-xs">
              {settings.siteTagline ||
                'The premier copy-paste photo prompt directory for Midjourney, ChatGPT, Flux, and Gemini.'}
            </p>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest text-[11px] mb-4">
              Popular Categories
            </h4>
            <ul className="space-y-2.5">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-[#E60023] hover:translate-x-1 inline-block transition-all font-medium text-sm"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest text-[11px] mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-amber-500 inline-flex items-center gap-1.5 transition-all font-medium text-sm group"
                >
                  <Coins className="w-4 h-4 text-amber-500 group-hover:animate-bounce" />
                  <span>Pricing & Credits</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/create"
                  className="hover:text-[#E60023] inline-flex items-center gap-1.5 transition-all font-medium text-sm group"
                >
                  <Sparkles className="w-4 h-4 text-[#E60023] group-hover:scale-110" />
                  <span>AI Studio</span>
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[#E60023] hover:translate-x-1 inline-block transition-all font-medium text-sm">
                  Blog Archive
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#E60023] hover:translate-x-1 inline-block transition-all font-medium text-sm">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Guides */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest text-[11px] mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#E60023]" />
              <span>Tutorials</span>
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/blog/how-to-use-photo-prompts"
                  className="hover:text-[#E60023] inline-flex items-center gap-2 transition-all font-medium text-sm"
                >
                  <HelpCircle className="w-4 h-4 text-[#E60023]" />
                  <span>How to Use Prompts</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/best-camera-settings-for-ai-photography"
                  className="hover:text-[#E60023] inline-block transition-all font-medium text-sm"
                >
                  Camera & Lens Optics Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/top-10-ai-prompting-mistakes-to-avoid"
                  className="hover:text-[#E60023] inline-block transition-all font-medium text-sm"
                >
                  10 Mistakes to Avoid
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Legal Links */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-500">
          <p className="font-medium text-center md:text-left">
            © {new Date().getFullYear()} Trending Copy Paste Photo Prompts. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/privacy-policy" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/disclaimer" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
