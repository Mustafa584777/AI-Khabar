'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Sparkles, Shield, Mail, Bell } from 'lucide-react';
import Image from 'next/image';

export const Footer = () => {
  const {
    settings,
    categories,
    setSelectedCategory,
    setCurrentView,
  } = useApp();

  return (
    <footer className="mt-16 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
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
                    className="hover:text-[#E60023] transition-colors cursor-pointer"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Community & Legal */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E60023]" />
              <span>Community & Legal</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    setCurrentView('for-you');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#E60023] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#E60023]" />
                  <span>Updates & Notifications</span>
                </button>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-[#E60023] transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Contact Support</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-[#E60023] transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/disclaimer"
                  className="hover:text-[#E60023] transition-colors"
                >
                  Disclaimer & Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400">
          <p>© {new Date().getFullYear()} Trending Copy Paste Photo Prompts. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-neutral-600 dark:hover:text-neutral-200">
              Privacy Policy
            </Link>
            <Link href="/disclaimer" className="hover:text-neutral-600 dark:hover:text-neutral-200">
              Disclaimer
            </Link>
            <Link href="/contact" className="hover:text-neutral-600 dark:hover:text-neutral-200">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
