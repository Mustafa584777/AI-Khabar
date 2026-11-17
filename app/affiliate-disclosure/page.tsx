import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { Info, Home, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | Zeena Prompt',
  description: 'Affiliate disclosure and transparency notice for links featured on Zeena Prompt.',
  robots: {
    index: false,
    follow: false,
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/60">
              <Info className="w-4 h-4" />
              <span>Transparency & Partner Links</span>
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
                1. Affiliate Relationships
              </h2>
              <p>
                In compliance with the Federal Trade Commission (FTC) guidelines and international transparency standards, please assume that some links on <strong>zeenaprompt.com</strong> — including product tags, shopping hotspots displayed alongside prompt previews, and recommended creative resources — may be affiliate links.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                2. Amazon Associates Disclosure
              </h2>
              <p>
                <strong>zeenaprompt.com</strong> may participate in the Amazon Services LLC Associates Program and Amazon India Associates Program, affiliate advertising programs designed to provide a means for websites to earn advertising fees by advertising and linking to Amazon properties. As an Amazon Associate, we earn from qualifying purchases made through tagged outfit, accessory, or product links.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                3. No Extra Cost to You
              </h2>
              <p>
                Clicking an affiliate link and making a purchase never increases the price you pay. Any small commission earned helps cover our hosting, image delivery, AI utility tools, and free prompt library maintenance without adding intrusive popups.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                4. Editorial Integrity & Contact
              </h2>
              <p>
                Our prompt curation, recommendations, and tool listings are chosen based on visual relevance and usefulness for creators. If you have any questions about our affiliate partnerships, please reach out via our{' '}
                <Link href="/contact" className="text-[#E60023] font-semibold hover:underline">
                  Contact Page
                </Link>.
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
