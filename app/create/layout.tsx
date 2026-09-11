import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Studio Lab - Image to Prompt & Art Generator | Trending Prompts',
  description: 'Reverse-engineer precise AI prompts from any photo with optical analysis or generate high-fidelity AI artwork.',
  openGraph: {
    title: 'AI Studio Lab - Image to Prompt & Art Generator | Trending Prompts',
    description: 'Reverse-engineer precise AI prompts from any photo with optical analysis or generate high-fidelity AI artwork.',
    url: 'https://geminipromptgenerator.online/create',
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
