'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Instagram,
  Facebook,
  Send,
  Globe,
  MessageCircle,
  HelpCircle,
  Coins,
  ShieldCheck,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const Footer = () => {
  const { categories, setSelectedCategory } = useApp();

  const topCategories = categories.slice(0, 5);

  return (
    <footer className="mt-20 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 text-xs pb-24 sm:pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center space-y-10">
        
        {/* Brand Header */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm border border-[#E60023]/30 bg-white dark:bg-neutral-900 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Gemini Prompt Generator"
                width={48}
                height={48}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="font-black text-xl sm:text-2xl text-neutral-900 dark:text-white tracking-tight">
              Gemini Prompt Generator
            </span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            The premier library for high-fidelity AI photo editing prompts. Optimized for Gemini, ChatGPT, and Midjourney.
          </p>
        </div>

        {/* Social Icon Circles */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] hover:text-[#E60023] dark:hover:text-white flex items-center justify-center transition-all bg-white dark:bg-neutral-900 shadow-xs hover:scale-110"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] hover:text-[#E60023] dark:hover:text-white flex items-center justify-center transition-all bg-white dark:bg-neutral-900 shadow-xs hover:scale-110"
            title="Facebook"
          >
            <Facebook className="w-4 h-4" />
          </a>
          <a
            href="https://whatsapp.com/channel/0029VbBdohQHltY7L6LJu703"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center transition-all bg-white dark:bg-neutral-900 shadow-xs hover:scale-110"
            title="WhatsApp Channel"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
          </a>
          <a
            href="https://pinterest.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] hover:text-[#E60023] dark:hover:text-white flex items-center justify-center transition-all bg-white dark:bg-neutral-900 shadow-xs hover:scale-110"
            title="Pinterest"
          >
            <Globe className="w-4 h-4" />
          </a>
          <a
            href="https://telegram.org"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center transition-all bg-white dark:bg-neutral-900 shadow-xs hover:scale-110"
            title="Telegram"
          >
            <Send className="w-4 h-4 text-blue-500" />
          </a>
        </div>

        {/* Quick Links / Grid Sections */}
        <div className="space-y-8 pt-4 border-t border-neutral-200 dark:border-neutral-800/80">
          <h4 className="font-bold text-neutral-900 dark:text-neutral-200 uppercase tracking-widest text-[11px]">
            Quick Links & Directory
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            {/* Top 5 Categories */}
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
                Top 5 Categories
              </h5>
              <ul className="space-y-2">
                {topCategories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
                AI Tools
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link href="/create" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    AI Studio (Image to Prompt)
                  </Link>
                </li>
                <li>
                  <Link href="/create" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Idea to Prompt Generator
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Creator Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Pricing & Credits
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Company */}
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
                Company & Policies
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Pricing Page
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Terms and Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/cancellation-refund" className="hover:text-[#E60023] dark:hover:text-white transition-colors text-xs font-medium">
                    Cancellation and Refund
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright Line */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800/80 text-center">
          <p className="text-xs font-semibold text-neutral-500">
            © 2026 Gemini Prompt Generator. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};
