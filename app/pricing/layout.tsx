import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Yearly Plan (₹99/year) | Zeenaprompt',
  description: 'Unlock all premium prompts, 120 tool credits, AI Search & unlimited saves for ₹99/year.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
