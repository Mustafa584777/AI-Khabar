import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { ShieldCheck, Home, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | Trending Copy Paste Photo Prompts',
  description: 'Affiliate and sponsored links disclosure notice for Zeena Prompt (zeenaprompt.com).',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AffiliateDisclosurePage() {
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
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold">Affiliate Disclosure</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div className="space-y-3 border-b border-neutral-100 dark:border-neutral-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparency &amp; FTC Compliance</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Affiliate Disclosure
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Last Updated: November 2026
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-neutral-300">
            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                1. Affiliate Relationship Transparency
              </h2>
              <p>
                In accordance with the Federal Trade Commission (FTC) guidelines concerning the use of endorsements and testimonials in advertising, please be aware that <strong>zeenaprompt.com</strong> (&ldquo;Zeena Prompt&rdquo;) participates in various affiliate marketing programs, including the Amazon Services LLC Associates Program and selected AI software or creative tool partner programs.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                2. How Affiliate Links Work
              </h2>
              <p>
                Certain links across prompt cards, outfit/product hotspots, tool recommendations, and resource guides on this website may be affiliate tracking links. If you click on an affiliate link and make a qualifying purchase or sign up on a third-party retailer or platform, we may earn a small commission at <strong>zero extra cost to you</strong>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                3. Editorial Independence
              </h2>
              <p>
                Our primary commitment is curating helpful AI photography prompts, editing workflows, and browser-native image utilities. Any affiliate commissions help support server hosting, free tools such as our Watermark Remover, and ongoing prompt testing, without influencing our prompt quality or recommendations.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                4. Third-Party Sites
              </h2>
              <p>
                Once you leave <strong>zeenaprompt.com</strong> via an external product or affiliate link, purchases, pricing, shipping, and privacy practices are governed solely by that third-party merchant&apos;s policies. Please review their terms before completing any transaction.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                5. Questions
              </h2>
              <p>
                If you have questions regarding any affiliate disclosures or partner links on this site, feel free to reach out through our{' '}
                <Link href="/contact" className="text-[#E60023] font-semibold hover:underline">
                  Contact page
                </Link>
                .
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

      <Footer />
    </div>
  );
}
