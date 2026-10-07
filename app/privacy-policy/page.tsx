import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { ShieldCheck, Home, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Trending Copy Paste Photo Prompts',
  description: 'Learn how Trending Copy Paste Photo Prompts collects, uses, and safeguards user data and cookies.',
};

export default function PrivacyPolicyPage() {
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
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold">Privacy Policy</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div className="space-y-3 border-b border-neutral-100 dark:border-neutral-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-4 h-4" />
              <span>Legal & Transparency</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Effective Date: January 1, 2026 | Last Updated: March 2026
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-neutral-300">
            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                1. Introduction & Overview
              </h2>
              <p>
                Welcome to <strong>Trending Copy Paste Photo Prompts</strong> (accessible at geminipromptgenerator.online).
                We respect your privacy and are committed to protecting any personal data or information you may share while browsing our curated AI prompts, tutorials, and creative tools.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                2. Information We Collect
              </h2>
              <p>
                When you access our platform, we may collect minimal technical and usage information:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Voluntary Account Information:</strong> If you register or log in, we store your email address, display name, and your saved prompt bookmarks or AI generation history.</li>
                <li><strong>Local Device Storage:</strong> We use browser localStorage to keep your taste preferences, theme (dark/light), and bookmarks synced across your visits.</li>
                <li><strong>Analytics Data:</strong> We utilize Google Analytics (gtag.js) to monitor anonymous traffic trends, session duration, and page interactions. This data is aggregated and does not identify individuals.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                3. How We Use Your Information
              </h2>
              <p>
                We use collected information solely to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide, maintain, and optimize our copy-paste prompt directory and AI Studio.</li>
                <li>Personalize your feed based on your selected aesthetic categories and styles.</li>
                <li>Prevent abuse, spam, and unauthorized access to our platform and services.</li>
                <li>Analyze aggregate metrics to improve prompt quality and site loading speed.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                4. Cookies & Web Beacons
              </h2>
              <p>
                Like most modern websites, we use essential cookies and analytics tags to understand how users interact with our content. You may configure your browser settings to reject cookies, although certain personalized features (such as saved bookmarks) may rely on local browser storage.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                5. Third-Party Services & Links
              </h2>
              <p>
                Our website may include links to external websites, such as Midjourney, OpenAI ChatGPT, Flux, or Google AI. We do not exercise control over external third-party sites and encourage you to review their individual privacy statements.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                6. Contacting Us
              </h2>
              <p>
                If you have questions regarding this Privacy Policy or wish to request data removal, please contact us via our{' '}
                <Link href="/contact" className="text-[#E60023] font-bold hover:underline">
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

      <AdminLoginModal />
      <Footer />
    </div>
  );
}
