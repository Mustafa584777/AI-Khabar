import { SmartRouteSkeleton } from '@/components/public/SmartRouteSkeleton';

export default function WatermarkRemoverLoading() {
  return (
    <SmartRouteSkeleton
      targetUrl="/free-gemini-watermark-remover-online"
      label="Loading Free Gemini Watermark Remover..."
      isFullScreenOverlay={false}
    />
  );
}
