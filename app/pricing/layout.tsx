import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing Plans | Zeenaprompt',
  description: 'Choose your plan and credits.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
