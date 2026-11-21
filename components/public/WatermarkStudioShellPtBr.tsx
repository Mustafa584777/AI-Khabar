'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Edit3,
  Eraser,
  History,
  Wand2,
  Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { startRouteNavigation } from '@/lib/navigation';
import { WatermarkRemoverToolPtBr } from '@/components/public/WatermarkRemoverToolPtBr';

export const WatermarkStudioShellPtBr = () => {
  const router = useRouter();
  const {
    setCurrentView,
    setSelectedCategory,
    setSearchQuery,
    userAccount,
  } = useApp();

  const navigateStudioTab = (tab: 'reverse' | 'generator' | 'editor', label: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_tab', tab);
    }
    startRouteNavigation('/create', label);
    router.push('/create');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-12">
      {/* Barra Superior Fixa do Estúdio */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setCurrentView('public');
              if (setSelectedCategory) setSelectedCategory('all');
              if (setSearchQuery) setSearchQuery('');
              startRouteNavigation('/', 'Carregando Feed de Prompts...');
              router.push('/');
            }}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Feed</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 to-violet-500/15 border border-pink-300/60 dark:border-pink-800/60 text-pink-600 dark:text-pink-300 text-xs font-black">
              100% Grátis • Offline
            </span>

            {userAccount?.isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('user-dashboard');
                  startRouteNavigation('/dashboard', 'Carregando Painel do Criador...');
                  router.push('/dashboard');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#E60023]" />
                <span>Ver Histórico</span>
              </button>
            )}

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#E60023] text-xs font-black">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Laboratório AI Studio</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Navegação por Abas do Estúdio */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-px overflow-x-auto">
          <div className="flex gap-6 whitespace-nowrap">
            <button
              type="button"
              onClick={() => navigateStudioTab('reverse', 'Abrindo Estúdio Imagem para Prompt...')}
              className="pb-4 text-xs sm:text-sm font-bold border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Imagem para Prompt</span>
            </button>
            <button
              type="button"
              onClick={() => navigateStudioTab('generator', 'Abrindo Gerador de Prompts...')}
              className="pb-4 text-xs sm:text-sm font-bold border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>Ideia para Prompt</span>
            </button>
            <button
              type="button"
              onClick={() => navigateStudioTab('editor', 'Abrindo Editor de Prompt IA...')}
              className="pb-4 text-xs sm:text-sm font-bold border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-emerald-500" />
              <span>Editor e Modificador de Prompt IA</span>
            </button>
            <Link
              href="/removedor-de-marca-dagua-gemini-online"
              prefetch={false}
              className="pb-4 text-xs sm:text-sm font-bold border-b-2 border-pink-500 text-pink-600 dark:text-pink-400 transition-all flex items-center gap-2"
            >
              <Eraser className="w-4 h-4 text-pink-500" />
              <span>Removedor de Marca d&apos;Água Gemini Grátis</span>
            </Link>
          </div>
        </div>

        <div className="py-2">
          <WatermarkRemoverToolPtBr />
        </div>
      </div>
    </div>
  );
};
