import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Dashboard | Gemini & Midjourney Prompts Studio',
  description: 'Manage your saved AI prompts, track your reverse-engineered generations, and customize your creative taste profile.',
  openGraph: {
    title: 'Creator Dashboard | Gemini & Midjourney Prompts Studio',
    description: 'Manage your saved AI prompts, track your reverse-engineered generations, and customize your creative taste profile.',
    url: 'https://geminipromptgenerator.online/dashboard',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
