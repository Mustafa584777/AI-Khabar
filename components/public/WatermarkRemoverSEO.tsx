'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Minus,
  ChevronDown,
  ShieldCheck,
  WifiOff,
  Sparkles,
  Layers,
  Zap,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';

export const WATERMARK_FAQ_ITEMS = [
  {
    question: 'Is this Free Gemini Watermark Remover Online really 100% free without limits?',
    answer:
      'Yes. Unlike tools that restrict exports behind daily credit walls or paid upgrades, you can remove Gemini watermark for free with unlimited images, zero login requirements, and full HD PNG or JPG downloads.',
  },
  {
    question: 'How does this Gemini logo remover protect my privacy compared to other websites?',
    answer:
      'All pixel reconstruction runs locally inside your browser using HTML5 Canvas and JavaScript memory. Your photos are never uploaded to any remote server, making it safe for personal portraits, client drafts, and confidential creative work—even when your device is offline.',
  },
  {
    question: 'Which removal mode should I choose for the Gemini sparkle logo vs. text watermarks?',
    answer:
      'Use HD Texture Fill (our multi-scale PatchMatch + Poisson gradient engine) for textured backgrounds like hair, skin, foliage, or fabric. Choose Transparent Watermark Eraser when removing semi-transparent white corner logos where underlying pixels are still faintly visible. Pick Instant Smooth Fill for solid walls, studio backdrops, or clear skies.',
  },
  {
    question: 'How is Zeena Prompt better than geminiwatermarkremover.in and geminiwatermarkremover.io?',
    answer:
      'While single-mode removers typically rely on one generic auto-crop or basic corner blend and require an active internet connection, Zeena Prompt gives you three specialized reconstruction engines, 1-click bottom-right & bottom-left presets, an adjustable 10–85px manual brush for off-center stamps, a live Before/After split slider, offline PWA functionality, and integrated AI prompt creation tools.',
  },
  {
    question: 'Will removing the Gemini watermark reduce my image resolution or blur nearby details?',
    answer:
      'No. Images are processed in crisp resolution up to 2400px on the longest edge without aggressive server re-compression. Our Poisson seamless gradient blending preserves sharp surrounding textures instead of smudging them.',
  },
  {
    question: 'Can I remove watermarks on mobile phones (Android / iPhone) without installing an app?',
    answer:
      'Yes. The touch-friendly brush canvas, 1-tap corner preset buttons, and Before/After drag slider work natively in Chrome, Safari, and Edge on both Android and iOS—plus you can use it offline anytime.',
  },
];

interface ComparisonRow {
  feature: string;
  zeena: { text: string; supported: boolean; highlight?: boolean };
  competitorIn: { text: string; supported: boolean };
  competitorIo: { text: string; supported: boolean };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Pricing & Daily Quota',
    zeena: { text: '100% Free · Unlimited Images', supported: true, highlight: true },
    competitorIn: { text: 'Free (Ad-supported)', supported: true },
    competitorIo: { text: 'Free tier / Feature limits', supported: true },
  },
  {
    feature: 'Zero-Upload On-Device Privacy',
    zeena: { text: '100% Local Browser RAM', supported: true, highlight: true },
    competitorIn: { text: 'Browser-based', supported: true },
    competitorIo: { text: 'Mixed / Cloud options', supported: true },
  },
  {
    feature: 'Works Completely Offline',
    zeena: { text: 'Full Offline Support', supported: true, highlight: true },
    competitorIn: { text: 'Requires Internet', supported: false },
    competitorIo: { text: 'Requires Internet', supported: false },
  },
  {
    feature: 'Reconstruction Engines',
    zeena: { text: '3 Modes (HD PatchMatch, Matte Unblend, Smooth)', supported: true, highlight: true },
    competitorIn: { text: 'Single auto-blend mode', supported: false },
    competitorIo: { text: 'Single standard mode', supported: false },
  },
  {
    feature: '1-Tap Corner Presets + Manual Brush',
    zeena: { text: 'Both (Auto Corner + 10–85px Precision Brush)', supported: true, highlight: true },
    competitorIn: { text: 'Corner preset only', supported: false },
    competitorIo: { text: 'Auto corner / basic crop', supported: false },
  },
  {
    feature: 'Interactive Before / After Drag Slider',
    zeena: { text: 'Live Split Comparison', supported: true, highlight: true },
    competitorIn: { text: 'Basic preview', supported: false },
    competitorIo: { text: 'Basic side-by-side', supported: false },
  },
  {
    feature: 'Output Quality & Export Formats',
    zeena: { text: 'Crisp HD PNG & 96% JPG (up to 2400px)', supported: true, highlight: true },
    competitorIn: { text: 'Standard PNG', supported: true },
    competitorIo: { text: 'PNG / Compressed JPG', supported: true },
  },
  {
    feature: 'Signup / Login Required',
    zeena: { text: 'Zero Login Needed', supported: true, highlight: true },
    competitorIn: { text: 'No Login', supported: true },
    competitorIo: { text: 'No (Optional account)', supported: true },
  },
  {
    feature: 'Built-In AI Prompt Studio & Library',
    zeena: { text: 'Included (400+ Prompts & Image-to-Prompt)', supported: true, highlight: true },
    competitorIn: { text: 'Not Available', supported: false },
    competitorIo: { text: 'Not Available', supported: false },
  },
];

export const WatermarkRemoverSEO: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <section
      aria-label="About Free Gemini Watermark Remover Online"
      className="mt-12 pt-10 border-t border-neutral-200 dark:border-neutral-800 space-y-12 [content-visibility:auto] [contain-intrinsic-size:auto_1200px]"
    >
      {/* Editorial Overview & Key Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
            Browser-Native Pixel Reconstruction
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white [text-wrap:balance]">
            Why Use Our Free Gemini Watermark Remover Online?
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            AI-generated images from Google Gemini, Imagen, and Flow often include a visible four-point sparkle badge or text stamp in the corner. Instead of cropping away important framing or uploading private portraits to third-party servers, our{' '}
            <strong className="font-semibold text-neutral-900 dark:text-neutral-200">
              Gemini logo remover
            </strong>{' '}
            lets you{' '}
            <strong className="font-semibold text-neutral-900 dark:text-neutral-200">
              remove Gemini watermark for free
            </strong>{' '}
            directly inside your browser memory in under 3 seconds.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              0 KB Uploaded to Cloud
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <WifiOff className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              100% Offline Capable
            </span>
            <span aria-hidden="true">·</span>
            <span>Up to 2400px HD Export</span>
          </div>
        </div>

        {/* 3 Precision Engines Breakdown */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <article className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-pink-600 dark:text-pink-400">
              <span>01. HD Texture Fill</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              PatchMatch + Poisson Blend
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Synthesizes matching skin, hair, fabric, and natural grain patterns, then solves seamless gradient blending so edges never look smudged.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-violet-600 dark:text-violet-400">
              <span>02. Matte Inversion</span>
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Transparent Logo Eraser
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Mathematically unblends semi-transparent white sparkle overlays and subtle corner text to recover the true original background pixels underneath.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>03. Smooth Fill</span>
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Sub-Second Backdrop Clean
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Clears stamps over studio backdrops, skies, and clean gradients in under 0.4s—ideal for quick product shots and social thumbnails.
            </p>
          </article>
        </div>
      </div>

      {/* Step-by-Step How-To Guide */}
      <div className="space-y-5">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            How to Remove Gemini Watermark for Free in 3 Steps
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Clean any AI-generated portrait, wallpaper, or commercial creative right on your phone or desktop in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
              01 · Upload Locally
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Load Your Gemini Photo
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Drag and drop or select any PNG, JPG, or WEBP image. The file opens strictly inside your device memory with zero server transfer.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
              02 · Mark Logo or Text
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Tap Corner Preset or Brush
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Use <strong className="font-semibold text-neutral-800 dark:text-neutral-200">Auto-Mark Gemini Logo</strong> for standard bottom-right sparkles, or paint over custom badges with the adjustable <span className="tabular-nums">10–85px</span> brush.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
              03 · Verify &amp; Export HD
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Compare Slider &amp; Download
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Click <strong className="font-semibold text-neutral-800 dark:text-neutral-200">Remove Watermark Now</strong>, inspect the result using the interactive Before/After split slider, and export as lossless HD PNG or JPG.
            </p>
          </div>
        </div>
      </div>

      {/* Competitor Comparison Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Comparison: Zeena Prompt vs. geminiwatermarkremover.in &amp; geminiwatermarkremover.io
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              See how our <strong className="font-semibold text-neutral-800 dark:text-neutral-200">Free Gemini Watermark Remover Online</strong> compares against popular single-purpose watermark removers across privacy, offline reliability, and reconstruction control.
            </p>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Verified Feature Matrix
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60">
                  <th scope="col" className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 w-[26%]">
                    Feature / Capability
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-5 text-xs font-bold text-neutral-900 dark:text-white bg-pink-50/70 dark:bg-pink-950/30 border-x border-pink-200/70 dark:border-pink-900/50 w-[28%]"
                  >
                    Zeena Prompt (This Tool)
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-xs font-bold text-neutral-700 dark:text-neutral-300 w-[23%]">
                    geminiwatermarkremover.in
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-xs font-bold text-neutral-700 dark:text-neutral-300 w-[23%]">
                    geminiwatermarkremover.io
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-xs sm:text-sm">
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <th
                      scope="row"
                      className="py-3.5 px-5 font-semibold text-neutral-900 dark:text-neutral-100 align-top"
                    >
                      {row.feature}
                    </th>
                    <td className="py-3.5 px-5 bg-pink-50/35 dark:bg-pink-950/15 border-x border-pink-200/60 dark:border-pink-900/40 align-top">
                      <div className="flex items-start gap-2 font-semibold text-neutral-900 dark:text-white tabular-nums">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{row.zeena.text}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600 dark:text-neutral-400 align-top">
                      <div className="flex items-start gap-2">
                        {row.competitorIn.supported ? (
                          <Check className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <span>{row.competitorIn.text}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600 dark:text-neutral-400 align-top">
                      <div className="flex items-start gap-2">
                        {row.competitorIo.supported ? (
                          <Check className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <span>{row.competitorIo.text}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions (Interactive Accordion matching FAQPage Schema) */}
      <div className="space-y-4">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Frequently Asked Questions About Our Gemini Logo Remover
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Everything you need to know to remove Gemini watermark for free cleanly and safely.
          </p>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          {WATERMARK_FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer min-h-[48px]"
                >
                  <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
                    {item.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-pink-600 dark:text-pink-400' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clean Related AI Tools Strip (Internal Linking for SEO) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Need Fresh Prompts After Cleaning Your Photos?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Explore 400+ copy-paste AI photo prompts or extract exact camera prompts from any image inside AI Studio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/"
            prefetch={false}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition-colors whitespace-nowrap"
          >
            Browse Prompt Library
          </Link>
          <Link
            href="/create"
            prefetch={false}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 text-xs font-bold inline-flex items-center gap-1.5 transition-opacity whitespace-nowrap"
          >
            <span>Open AI Prompt Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
