import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import ReactDOM from 'react-dom';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AppGlobalOverlays } from '@/components/public/AppGlobalOverlays';

const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 0.7,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://zeenaprompt.com'),
  title: 'Trending Copy Paste Photo Prompts',
  description: 'Explore trending copy paste photo prompts for Midjourney, ChatGPT, Flux, Claude and Gemini. Instant copy, high-res previews, and creative AI prompt settings.',
  manifest: '/manifest.ts',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PromptApp',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
  verification: {
    google: 'uh9o8y5P0cVpFtJIJXovv8RSzxSxcRkOYLK6ZthiZDg',
  },
  openGraph: {
    title: 'Trending Copy Paste Photo Prompts',
    description: 'Explore trending copy paste photo prompts for Midjourney, ChatGPT, Flux, Claude and Gemini.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending Copy Paste Photo Prompts',
    description: 'Explore trending copy paste photo prompts for Midjourney, ChatGPT, Flux, Claude and Gemini.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  ReactDOM.preconnect('https://cdn.jsdelivr.net', { crossOrigin: 'anonymous' });
  ReactDOM.preconnect('https://images.unsplash.com', { crossOrigin: 'anonymous' });
  ReactDOM.preconnect('https://bauval.org', { crossOrigin: 'anonymous' });
  if (typeof (ReactDOM as any).prefetchDNS === 'function') {
    (ReactDOM as any).prefetchDNS('https://cdn.jsdelivr.net');
    (ReactDOM as any).prefetchDNS('https://images.unsplash.com');
    (ReactDOM as any).prefetchDNS('https://bauval.org');
  }

  return (
    <html lang="en" className="dark">
      <body className={`${poppins.variable} ${poppins.className} font-sans antialiased selection:bg-[#E60023] selection:text-white`} suppressHydrationWarning>
        <AppProvider>
          {children}
          <AppGlobalOverlays />
        </AppProvider>

        {/* Google Analytics (Strict Rule: G-Y6H3B2LY6D and G-28QHB2KNZC preserved & active across all pages; deferred after first interaction/idle for 0ms TBT) */}
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Y6H3B2LY6D');
            gtag('config', 'G-28QHB2KNZC');
            gtag('config', 'G-32DL2FJ0FQ');

            (function() {
              var loaded = false;
              function loadGtag() {
                if (loaded) return;
                loaded = true;
                var s = document.createElement('script');
                s.async = true;
                s.src = 'https://www.googletagmanager.com/gtag/js?id=G-Y6H3B2LY6D';
                document.head.appendChild(s);
              }
              var events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
              events.forEach(function(evt) {
                window.addEventListener(evt, loadGtag, { once: true, passive: true });
              });
              window.addEventListener('load', function() {
                setTimeout(loadGtag, 6000);
              }, { once: true });
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
