import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-rose-200">
          <Sparkles className="w-3.5 h-3.5" />
          AuraPrompt Studio
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-neutral-900 dark:text-white tracking-tight">
          Elite AI Prompt Marketplace & Generation Studio
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-lg">
          Discover, unlock, and engineer high-performance AI prompts with flexible credit plans starting at ₹49.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#E60023] hover:bg-[#d00020] text-white font-bold text-sm shadow-md transition-all"
          >
            View Pricing & Plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
