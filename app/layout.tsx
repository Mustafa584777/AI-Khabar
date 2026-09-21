import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pricing & Pro Plans - Trending Copy Paste Photo Prompts',
  description: 'Choose the best plan for AI prompt generation, creative tools, and unlimited photo prompt access.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
