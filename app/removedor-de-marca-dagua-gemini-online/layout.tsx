import type { Metadata } from 'next';

const PAGE_URL = 'https://zeenaprompt.com/removedor-de-marca-dagua-gemini-online';
const EN_PAGE_URL = 'https://zeenaprompt.com/free-gemini-watermark-remover-online';

export const metadata: Metadata = {
  title: "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque | Zeena Prompt",
  description:
    "Use nosso Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque para apagar logos brilhantes e marcas d'água do Gemini em HD nítido direto no navegador—sem login e sem uploads.",
  keywords: [
    "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque",
    "removedor de marca d'água gemini online",
    "remover marca d'água gemini grátis",
    'tirar marca d água do gemini sem desfoque',
    'apagar logo gemini em HD',
    "removedor de marca d'água IA offline",
  ],
  alternates: {
    canonical: PAGE_URL,
    languages: {
      en: EN_PAGE_URL,
      'pt-BR': PAGE_URL,
    },
  },
  openGraph: {
    title: "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque | Zeena Prompt",
    description:
      "Use nosso Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque direto no navegador. Apague logos do Gemini e selos de texto em HD nítido com privacidade total offline e zero envios ao servidor.",
    url: PAGE_URL,
    siteName: 'Zeena Prompt',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: 'https://zeenaprompt.com/logo.png',
        width: 512,
        height: 512,
        alt: "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque - Zeena Prompt",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque | Zeena Prompt",
    description:
      "Remova marcas d'água do Gemini sem desfoque em segundos. Reconstrução de textura em HD 100% no navegador sem envios ao servidor e com suporte offline.",
    images: ['https://zeenaprompt.com/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  inLanguage: 'pt-BR',
  name: "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque",
  alternateName: "Removedor de Logo Gemini Zeena Prompt",
  url: PAGE_URL,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'All',
  browserRequirements: 'Requer HTML5 Canvas e JavaScript',
  isAccessibleForFree: true,
  description:
    "Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque para apagar marcas d'água do Gemini em segundos no navegador com preenchimento de textura HD, inversão matte, zero envios e funcionamento offline.",
  featureList: [
    '100% Gratuito com usos diários ilimitados e sem login',
    'Zero envio para servidores — executa localmente na memória do navegador',
    'Funciona totalmente offline dentro do navegador',
    '3 modos de reconstrução: Textura HD (PatchMatch), Apagador Transparente e Preenchimento Suave Instantâneo',
    'Predefinições de 1 clique para logo Gemini e texto inferior esquerdo mais pincel de precisão 10–85px',
    'Controle deslizante interativo Antes/Depois e exportação em PNG/JPG HD até 2400px sem desfoque',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  inLanguage: 'pt-BR',
  name: "Como Usar o Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque",
  description:
    "Guia passo a passo para apagar logos brilhantes do Gemini e marcas d'água de texto sem desfoque direto no navegador.",
  totalTime: 'PT10S',
  tool: [
    {
      '@type': 'HowToTool',
      name: "Zeena Prompt Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque",
    },
  ],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Envie Sua Foto do Gemini Localmente',
      text: 'Selecione ou arraste qualquer imagem PNG, JPG ou WEBP para o canvas do navegador. O arquivo permanece na memória do aparelho sem nenhum envio ao servidor.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: "Marque o Logo do Gemini ou a Marca d'Água",
      text: 'Clique em Marcar Logo Gemini Auto para estrelas no canto inferior direito, Marcar Texto Inferior Esquerdo ou pinte qualquer área com o pincel ajustável de 10-85px.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: "Remova a Marca d'Água e Exporte em HD",
      text: "Clique em Remover Marca d'Água Agora, confira o resultado com o controle deslizante Antes/Depois e baixe sua imagem limpa em PNG HD ou JPG.",
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: 'pt-BR',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Este Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque é realmente 100% gratuito?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Sim. Ao contrário de sites que limitam downloads com créditos diários ou planos pagos, aqui você pode remover marca d'água do Gemini gratuitamente e sem desfoque em quantas imagens quiser, sem precisar de login e com exportação em HD PNG ou JPG.",
      },
    },
    {
      '@type': 'Question',
      name: 'Como este removedor de logo do Gemini protege minha privacidade em comparação a outros sites?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Toda a reconstrução de pixels acontece localmente dentro do seu navegador usando HTML5 Canvas e memória JavaScript. Suas fotos nunca são enviadas para nenhum servidor remoto, garantindo total segurança — mesmo quando o dispositivo estiver offline.',
      },
    },
    {
      '@type': 'Question',
      name: "Qual modo de remoção devo escolher para o ícone de brilho do Gemini ou marcas d'água de texto?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Use Textura HD para fundos detalhados como cabelo, pele, folhagens ou tecidos. Escolha Apagador de Marca Transparente para logos brancos semitransparentes nos cantos. Selecione Preenchimento Suave Instantâneo para paredes lisas, fundos de estúdio ou céus limpos.',
      },
    },
    {
      '@type': 'Question',
      name: 'Por que o Zeena Prompt é melhor que geminiwatermarkremover.in e geminiwatermarkremover.io?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'O Zeena Prompt oferece três motores especializados de reconstrução, predefinições de 1 clique no canto inferior direito e esquerdo, pincel manual ajustável de 10-85px, controle deslizante Antes/Depois ao vivo, suporte offline completo e ferramentas integradas de prompts de IA.',
      },
    },
    {
      '@type': 'Question',
      name: "Remover a marca d'água do Gemini reduz a resolução da imagem ou borra os detalhes próximos?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Não. As imagens são processadas em alta resolução até 2400px no lado maior sem compressão agressiva de servidor, e a mesclagem de gradiente contínuo Poisson preserva as texturas nítidas ao redor.',
      },
    },
    {
      '@type': 'Question',
      name: "Posso remover marcas d'água pelo celular (Android / iPhone) sem instalar aplicativo?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim. A tela sensível ao toque para pincel, os botões de canto com 1 toque e o controle deslizante Antes/Depois funcionam nativamente no Chrome, Safari e Edge tanto no Android quanto no iOS.',
      },
    },
  ],
};

export default function RemovedorDeMarcaDaguaGeminiOnlineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
