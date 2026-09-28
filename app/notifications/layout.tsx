import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | Zeenaprompt',
  description: 'View your notifications and updates.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
