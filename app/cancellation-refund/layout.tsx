import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | Zeenaprompt',
  description: 'Understand our strict no-cancellation policy, queued upgrades & downgrades, and refund rules for digital prompt tools and subscriptions on Zeena Prompt.',
  openGraph: {
    title: 'Cancellation & Refund Policy | Zeenaprompt',
    description: 'Understand our strict no-cancellation policy, queued upgrades & downgrades, and refund rules on Zeena Prompt.',
    url: 'https://zeenaprompt.com/cancellation-refund',
  },
};

export default function CancellationRefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
