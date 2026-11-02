'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export const Footer = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { categories, posts, setSelectedCategory, setSelectedSort, setSearchQuery } = useApp();

  const handleCategoryClick = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedSort('newest');
    setSearchQuery('');

    if (pathname === '/') {
      // Smoothly scroll up from footer to categories filter bar / prompt grid
      const el = document.getElementById('categories-filter-bar') || document.getElementById('prompts-grid-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 380, behavior: 'smooth' });
      }
      try {
        window.history.pushState(null, '', `/?category=${encodeURIComponent(catName)}`);
      } catch {}
    } else {
      router.push(`/?category=${encodeURIComponent(catName)}`);
    }
  };

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

        {/* WhatsApp Social Icon Only */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="https://whatsapp.com/channel/0029VbBdohQHltY7L6LJu703"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center transition-all bg-white dark:bg-neutral-900 shadow-xs hover:scale-110"
            title="WhatsApp Channel"
          >
            <svg className="w-5 h-5 text-emerald-500 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </a>
        </div>

        {/* Quick Links / Grid Sections */}
        <div className="space-y-8 pt-4 border-t border-neutral-200 dark:border-neutral-800/80">
          <h4 className="font-bold text-neutral-900 dark:text-neutral-200 uppercase tracking-widest text-[11px]">
            Quick Links & Directory
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            {/* Top Categories */}
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
                Top Categories
              </h5>
              <ul className="space-y-1.5">
                {categories
                  .filter((cat) => {
                    const count = posts.filter(
                      (p) => p.status === 'published' && p.category && p.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;
                    return count >= 5;
                  })
                  .map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(cat.name)}
                        className="group flex items-center justify-center sm:justify-start gap-2 w-full text-left py-1.5 px-2.5 -mx-2 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 hover:text-[#E60023] dark:hover:text-white transition-all text-xs font-semibold cursor-pointer active:scale-95 text-neutral-600 dark:text-neutral-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 group-hover:bg-[#E60023] transition-colors shrink-0" />
                        <span>{cat.name}</span>
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
