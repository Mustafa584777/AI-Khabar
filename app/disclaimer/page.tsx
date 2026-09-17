import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disclaimer | Trending Copy Paste Photo Prompts',
  description: 'Website disclaimer and AI generation notices for Trending Copy Paste Photo Prompts.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-[#E60023] flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold">Disclaimer</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div className="space-y-3 border-b border-neutral-100 dark:border-neutral-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800/60">
              <AlertCircle className="w-4 h-4" />
              <span>Notices & Fair Use</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Disclaimer
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Last Updated: March 2026
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-neutral-300">
            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                1. General Information Purpose
              </h2>
              <p>
                All prompts, sample artwork, and guides provided on <strong>geminipromptgenerator.online</strong> are curated for educational, inspirational, and creative experimental purposes only. While we test and curate prompts to provide optimal visual results across Midjourney, ChatGPT/DALL-E, Flux, and Gemini, results can vary significantly depending on model versions, updates, and platform seeds.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                2. Trademark & Affiliate Notice
              </h2>
              <p>
                Names such as Midjourney, OpenAI, ChatGPT, DALL-E, Google Gemini, Google DeepMind, Flux, and Anthropic Claude are trademarks of their respective owners. Their mention on this website is purely for descriptive, contextual, and reference purposes and does not imply any official affiliation, sponsorship, or endorsement.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                3. AI Generated Content
              </h2>
              <p>
                Sample images showcased alongside prompts are computer-generated using artificial intelligence software. They do not depict real living individuals or real events unless explicitly stated as historical educational references.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                4. Limitation of Liability
              </h2>
              <p>
                In no event shall the website authors or operators be held liable for any loss, damage, or commercial consequences arising from the use of prompts, text, or third-party image generation platforms linked to or referenced on this site.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#E60023] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </main>

      <AdminLoginModal />
      <Footer />
    </div>
  );
}
