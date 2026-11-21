'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Minus,
  ChevronDown,
  ShieldCheck,
  WifiOff,
  Sparkles,
  Layers,
  Zap,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';

export const WATERMARK_FAQ_ITEMS_PT_BR = [
  {
    question: "Este Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque é realmente 100% gratuito?",
    answer:
      "Sim. Ao contrário de sites que limitam downloads com créditos diários ou planos pagos, aqui você pode remover marca d'água do Gemini gratuitamente e sem desfoque em quantas imagens quiser, sem precisar de login e com exportação em HD PNG ou JPG.",
  },
  {
    question: 'Como este removedor de logo do Gemini protege minha privacidade em comparação a outros sites?',
    answer:
      'Toda a reconstrução de pixels acontece localmente dentro do seu navegador usando HTML5 Canvas e memória JavaScript. Suas fotos nunca são enviadas para nenhum servidor remoto, garantindo total segurança para retratos pessoais, projetos de clientes e trabalhos confidenciais — mesmo quando o dispositivo estiver offline.',
  },
  {
    question: "Qual modo de remoção devo escolher para o ícone de brilho do Gemini ou marcas d'água de texto?",
    answer:
      'Use Preenchimento de Textura HD (nosso motor multi-escala PatchMatch + gradiente Poisson) para fundos texturizados como cabelo, pele, folhagens ou tecidos. Escolha Apagador de Marca Transparente para logos brancos semitransparentes nos cantos onde os pixels originais ainda aparecem levemente. Use Preenchimento Suave Instantâneo para paredes lisas, fundos de estúdio ou céus limpos.',
  },
  {
    question: 'Por que o Zeena Prompt é melhor que geminiwatermarkremover.in e geminiwatermarkremover.io?',
    answer:
      'Enquanto removedores simples geralmente dependem de um único recorte automático ou mistura básica de canto e exigem internet ativa, o Zeena Prompt oferece três motores especializados de reconstrução, predefinições de 1 clique no canto inferior direito e esquerdo, pincel manual ajustável de 10–85px para carimbos fora do canto, controle deslizante Antes/Depois ao vivo, suporte offline e ferramentas integradas de prompts de IA.',
  },
  {
    question: "Remover a marca d'água do Gemini reduz a resolução da imagem ou borra os detalhes próximos?",
    answer:
      'Não. As imagens são processadas em alta resolução até 2400px no lado maior sem compressão agressiva de servidor, e a mesclagem de gradiente contínuo Poisson preserva as texturas nítidas ao redor sem deixar manchas borradas.',
  },
  {
    question: "Posso remover marcas d'água pelo celular (Android / iPhone) sem instalar aplicativo?",
    answer:
      'Sim. A tela sensível ao toque para pincel, os botões de canto com 1 toque e o controle deslizante Antes/Depois funcionam nativamente no Chrome, Safari e Edge tanto no Android quanto no iOS — e ainda funcionam offline a qualquer momento.',
  },
];

interface ComparisonRow {
  feature: string;
  zeena: { text: string; supported: boolean; highlight?: boolean };
  competitorIn: { text: string; supported: boolean };
  competitorIo: { text: string; supported: boolean };
}

const COMPARISON_ROWS_PT_BR: ComparisonRow[] = [
  {
    feature: 'Preço e Limite Diário',
    zeena: { text: '100% Grátis · Imagens Ilimitadas', supported: true, highlight: true },
    competitorIn: { text: 'Grátis (Com anúncios)', supported: true },
    competitorIo: { text: 'Plano grátis / Com limites', supported: true },
  },
  {
    feature: 'Privacidade Zero-Upload no Dispositivo',
    zeena: { text: '100% Local na RAM do Navegador', supported: true, highlight: true },
    competitorIn: { text: 'Baseado no navegador', supported: true },
    competitorIo: { text: 'Opções mistas / Nuvem', supported: true },
  },
  {
    feature: 'Funciona Totalmente Offline',
    zeena: { text: 'Suporte Offline Completo', supported: true, highlight: true },
    competitorIn: { text: 'Exige Internet', supported: false },
    competitorIo: { text: 'Exige Internet', supported: false },
  },
  {
    feature: 'Motores de Reconstrução',
    zeena: { text: '3 Modos (HD PatchMatch, Matte Unblend, Suave)', supported: true, highlight: true },
    competitorIn: { text: 'Apenas 1 modo automático', supported: false },
    competitorIo: { text: 'Apenas 1 modo padrão', supported: false },
  },
  {
    feature: 'Predefinições de 1 Toque + Pincel Manual',
    zeena: { text: 'Ambos (Canto Auto + Pincel Preciso 10–85px)', supported: true, highlight: true },
    competitorIn: { text: 'Apenas canto automático', supported: false },
    competitorIo: { text: 'Canto automático / recorte básico', supported: false },
  },
  {
    feature: 'Comparação Interativa Antes / Depois',
    zeena: { text: 'Controle Deslizante em Tempo Real', supported: true, highlight: true },
    competitorIn: { text: 'Prévia básica', supported: false },
    competitorIo: { text: 'Lado a lado simples', supported: false },
  },
  {
    feature: 'Qualidade de Saída e Formatos',
    zeena: { text: 'PNG HD Nítido e JPG 96% (até 2400px)', supported: true, highlight: true },
    competitorIn: { text: 'PNG padrão', supported: true },
    competitorIo: { text: 'PNG / JPG comprimido', supported: true },
  },
  {
    feature: 'Cadastro / Login Obrigatório',
    zeena: { text: 'Zero Login Necessário', supported: true, highlight: true },
    competitorIn: { text: 'Sem Login', supported: true },
    competitorIo: { text: 'Não (Conta opcional)', supported: true },
  },
  {
    feature: 'Estúdio de Prompts IA e Biblioteca',
    zeena: { text: 'Incluído (400+ Prompts e Imagem para Prompt)', supported: true, highlight: true },
    competitorIn: { text: 'Indisponível', supported: false },
    competitorIo: { text: 'Indisponível', supported: false },
  },
];

export const WatermarkRemoverSEOPtBr: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <section
      aria-label="Sobre o Removedor de Marca d'Água Gemini Online Grátis Sem Desfoque"
      className="mt-12 pt-10 border-t border-neutral-200 dark:border-neutral-800 space-y-12 [content-visibility:auto] [contain-intrinsic-size:auto_1200px]"
    >
      {/* Visão Geral Editorial e Recursos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
            Reconstrução de Pixels Nativa no Navegador
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white [text-wrap:balance]">
            Por Que Usar Nosso Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque?
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Imagens geradas por IA no Google Gemini, Imagen e Flow costumam incluir um selo de estrela de quatro pontas ou carimbo de texto no canto. Em vez de cortar partes importantes do enquadramento ou borrar detalhes, nosso{' '}
            <strong className="font-semibold text-neutral-900 dark:text-neutral-200">
              Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque
            </strong>{' '}
            permite{' '}
            <strong className="font-semibold text-neutral-900 dark:text-neutral-200">
              remover marca d&apos;água do Gemini grátis
            </strong>{' '}
            em HD nítido diretamente na memória do navegador em menos de 3 segundos.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              0 KB Enviado para a Nuvem
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <WifiOff className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              100% Compatível Offline
            </span>
            <span aria-hidden="true">·</span>
            <span>Exportação HD até 2400px</span>
          </div>
        </div>

        {/* Os 3 Motores de Precisão */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <article className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-pink-600 dark:text-pink-400">
              <span>01. Textura HD</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              PatchMatch + Mesclagem Poisson
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Sintetiza padrões idênticos de pele, cabelo, tecido e granulação natural, aplicando transição suave de gradiente para que as bordas nunca fiquem borradas.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-violet-600 dark:text-violet-400">
              <span>02. Inversão Matte</span>
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Apagador de Logo Transparente
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Reverte matematicamente sobreposições brancas semitransparentes e textos discretos nos cantos para recuperar os pixels originais escondidos abaixo.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>03. Preenchimento Suave</span>
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Limpeza em Menos de 1s
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Limpa carimbos sobre fundos de estúdio, céus e gradientes limpos em menos de 0,4s — ideal para fotos rápidas de produtos e capas.
            </p>
          </article>
        </div>
      </div>

      {/* Guia Passo a Passo */}
      <div className="space-y-5">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Como Remover Marca d&apos;Água do Gemini Grátis em 3 Passos
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Limpe qualquer retrato, papel de parede ou arte comercial criada por IA direto no seu celular ou computador em segundos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
              01 · Envio Local
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Carregue Sua Foto do Gemini
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Arraste e solte ou selecione qualquer imagem PNG, JPG ou WEBP. O arquivo abre estritamente na memória do dispositivo sem nenhum envio ao servidor.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
              02 · Marque o Logo ou Texto
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Toque na Predefinição ou Pincel
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Use <strong className="font-semibold text-neutral-800 dark:text-neutral-200">Marcar Logo Gemini Auto</strong> para estrelas no canto inferior direito, ou pinte sobre selos personalizados com o pincel ajustável de <span className="tabular-nums">10–85px</span>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
              03 · Confira e Exporte em HD
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Compare e Baixe Sem Perda
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Clique em <strong className="font-semibold text-neutral-800 dark:text-neutral-200">Remover Marca d&apos;Água Agora</strong>, verifique o resultado no controle deslizante Antes/Depois e baixe em PNG HD ou JPG.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Comparativa */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Comparação: Zeena Prompt vs. geminiwatermarkremover.in e geminiwatermarkremover.io
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Veja como nosso <strong className="font-semibold text-neutral-800 dark:text-neutral-200">Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque</strong> se compara a outras ferramentas populares em privacidade, uso offline e controle de reconstrução.
            </p>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Matriz de Recursos Verificada
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60">
                  <th scope="col" className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 w-[26%]">
                    Recurso / Capacidade
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-5 text-xs font-bold text-neutral-900 dark:text-white bg-pink-50/70 dark:bg-pink-950/30 border-x border-pink-200/70 dark:border-pink-900/50 w-[28%]"
                  >
                    Zeena Prompt (Esta Ferramenta)
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-xs font-bold text-neutral-700 dark:text-neutral-300 w-[23%]">
                    geminiwatermarkremover.in
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-xs font-bold text-neutral-700 dark:text-neutral-300 w-[23%]">
                    geminiwatermarkremover.io
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-xs sm:text-sm">
                {COMPARISON_ROWS_PT_BR.map((row) => (
                  <tr
                    key={row.feature}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <th
                      scope="row"
                      className="py-3.5 px-5 font-semibold text-neutral-900 dark:text-neutral-100 align-top"
                    >
                      {row.feature}
                    </th>
                    <td className="py-3.5 px-5 bg-pink-50/35 dark:bg-pink-950/15 border-x border-pink-200/60 dark:border-pink-900/40 align-top">
                      <div className="flex items-start gap-2 font-semibold text-neutral-900 dark:text-white tabular-nums">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{row.zeena.text}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600 dark:text-neutral-400 align-top">
                      <div className="flex items-start gap-2">
                        {row.competitorIn.supported ? (
                          <Check className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <span>{row.competitorIn.text}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600 dark:text-neutral-400 align-top">
                      <div className="flex items-start gap-2">
                        {row.competitorIo.supported ? (
                          <Check className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <span>{row.competitorIo.text}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Perguntas Frequentes */}
      <div className="space-y-4">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Perguntas Frequentes Sobre Nosso Removedor de Logo Gemini
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Tudo o que você precisa saber para remover marca d&apos;água do Gemini grátis com segurança e nitidez.
          </p>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          {WATERMARK_FAQ_ITEMS_PT_BR.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer min-h-[48px]"
                >
                  <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
                    {item.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-pink-600 dark:text-pink-400' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ferramentas de IA Relacionadas */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Precisa de Novos Prompts Depois de Limpar Suas Fotos?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Explore mais de 400 prompts de foto prontos para copiar e colar ou extraia prompts de câmera de qualquer imagem no AI Studio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/"
            prefetch={false}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition-colors whitespace-nowrap"
          >
            Explorar Biblioteca de Prompts
          </Link>
          <Link
            href="/create"
            prefetch={false}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 text-xs font-bold inline-flex items-center gap-1.5 transition-opacity whitespace-nowrap"
          >
            <span>Abrir Estúdio de Prompts IA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
