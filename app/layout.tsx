import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuraPrompt - AI Prompt Marketplace & Studio',
  description: 'Discover, generate, and unlock elite AI prompts with flexible credit packs and subscription plans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
