import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing & Pro Membership Plans | Trending Photo Prompts',
  description: 'Choose a monthly subscription plan. Unlock unlimited saved prompts, unlimited AI generation history saves, exclusive prompts, and bonus tool credits.',
  openGraph: {
    title: 'Pricing & Pro Membership Plans | Trending Photo Prompts',
    description: 'Choose a monthly subscription plan. Unlock unlimited saved prompts, unlimited AI generation history saves, exclusive prompts, and bonus tool credits.',
    url: 'https://geminipromptgenerator.online/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
