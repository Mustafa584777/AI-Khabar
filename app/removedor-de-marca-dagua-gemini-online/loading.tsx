import { SmartRouteSkeleton } from '@/components/public/SmartRouteSkeleton';

export default function RemovedorDeMarcaDaguaGeminiLoading() {
  return (
    <SmartRouteSkeleton
      targetUrl="/removedor-de-marca-dagua-gemini-online"
      label="Carregando Removedor de Marca d'Água Gemini..."
      isFullScreenOverlay={false}
    />
  );
}
