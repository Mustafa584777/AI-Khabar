import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium">
          <Sparkles className="w-4 h-4" /> AI Prompt Platform & Studio
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
          Create Stunning AI Photo Prompts with Professional Power
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Explore curated prompts, generate custom variations, and unlock unlimited creative potential with our Pro and Yearly plans.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/pricing"
            className="px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            View Pricing & Plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
