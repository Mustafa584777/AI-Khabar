import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Gemini Watermark Remover Online - Offline Instant Eraser | Zeena Prompt',
  description:
    'Free Gemini Watermark Remover Online tool to erase Gemini sparkles, logos, and text watermarks in seconds right inside your browser with zero server upload and full offline support.',
  alternates: {
    canonical: '/free-gemini-watermark-remover-online',
  },
};

export default function FreeGeminiWatermarkRemoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
