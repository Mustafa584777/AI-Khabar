import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Dashboard | Zeenaprompt',
  description: 'Manage your saved AI prompts, track your reverse-engineered generations, and customize your creative taste profile.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Creator Dashboard | Zeenaprompt',
    description: 'Manage your saved AI prompts, track your reverse-engineered generations, and customize your creative taste profile.',
    url: 'https://zeenaprompt.com/dashboard',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
