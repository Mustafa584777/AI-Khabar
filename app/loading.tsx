import { SmartRouteSkeleton } from '@/components/public/SmartRouteSkeleton';

export default function GlobalLoading() {
  return (
    <SmartRouteSkeleton
      targetUrl="/"
      label="Loading..."
      isFullScreenOverlay={false}
    />
  );
}
