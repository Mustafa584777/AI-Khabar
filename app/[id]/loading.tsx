import { SmartRouteSkeleton } from '@/components/public/SmartRouteSkeleton';

export default function PromptDetailLoading() {
  return (
    <SmartRouteSkeleton
      targetUrl="/prompt-card"
      label="Opening Prompt Card..."
      isFullScreenOverlay={false}
    />
  );
}
