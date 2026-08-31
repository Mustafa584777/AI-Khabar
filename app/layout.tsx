import type { Metadata } from 'next';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Trending Copy Paste Photo Prompts',
  description: 'Explore trending copy paste photo prompts for Midjourney, ChatGPT, Flux, Claude and Gemini with an integrated WordPress CMS.',
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
        {/* Google Site Verification */}
        <meta
          name="google-site-verification"
          content="uh9o8y5P0cVpFtJIJXovv8RSzxSxcRkOYLK6ZthiZDg"
        />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-28QHB2KNZC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-28QHB2KNZC');
          `}
        </Script>
      </head>
      <body className={`${poppins.variable} ${poppins.className} font-sans antialiased selection:bg-[#E60023] selection:text-white`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
