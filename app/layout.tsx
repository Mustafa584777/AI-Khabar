import type { Metadata } from 'next';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AppGlobalOverlays } from '@/components/public/AppGlobalOverlays';

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: 'Trending Copy Paste Photo Prompts',
  description: 'Explore trending copy paste photo prompts for Midjourney, ChatGPT, Flux, Claude and Gemini. Instant copy, high-res previews, and creative AI prompt settings.',
  icons: {
    icon: '/favicon.ico',
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
  return (
    <html lang="en" className="dark">
      <head>
        <link key="preconnect-cloudinary" rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link key="dns-prefetch-cloudinary" rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className={`${poppins.variable} ${poppins.className} font-sans antialiased selection:bg-[#E60023] selection:text-white`} suppressHydrationWarning>
        <AppProvider>
          {children}
          <AppGlobalOverlays />
        </AppProvider>

        {/* Google Analytics (Strict Rule: G-Y6H3B2LY6D and G-28QHB2KNZC preserved) */}
        <Script
          id="gtag-base"
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-32DL2FJ0FQ"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-32DL2FJ0FQ');
            gtag('config', 'G-Y6H3B2LY6D');
            gtag('config', 'G-28QHB2KNZC');
          `}
        </Script>
        <Script
          id="razorpay-checkout-sdk"
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
