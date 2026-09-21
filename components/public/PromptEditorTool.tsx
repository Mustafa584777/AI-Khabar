'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Wand2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  ArrowRight,
  Cpu,
  Edit3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const PromptEditorTool = () => {
  const router = useRouter();
  const { showToast, saveAiHistoryItem } = useApp();

  const [inputPrompt, setInputPrompt] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const preload = sessionStorage.getItem('promptcms_editor_preload');
      if (preload) {
        sessionStorage.removeItem('promptcms_editor_preload');
        return preload;
      }
    }
    return '';
  });
  const [changeInstructions, setChangeInstructions] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    enhancedPrompt: string;
    negativePrompt: string;
    improvementsMade: string[];
    parameters: Record<string, string>;
  } | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState<boolean>(false);
  const [copiedEnhanced, setCopiedEnhanced] = useState<boolean>(false);

  const samplePrompts = [
    'A cyberpunk street in Tokyo with neon signs and rain puddles',
    'Portrait of a young woman in vintage clothing with golden hour sunlight',
    'Futuristic sports car driving through a mountain highway at sunset',
    'Cozy wooden cabin in snowy mountains with warm glowing windows'
  ];

  const quickChangePresets = [
    'Change lighting to golden hour sunset with warm rim light',
    'Add neon cyberpunk lights, dark alley, and rain reflections',
    'Make it a bright sunny daytime shot with clear blue skies',
    'Shot on 35mm vintage Kodak Portra film with authentic grain',
    'Upgrade to photorealistic 8K ultra detail and studio lighting',
    'Add a supercar and modern architectural background',
  ];

  const handleEditPrompt = async () => {
    if (!inputPrompt.trim()) {
      showToast('Please enter your prompt in the first box.', 'error');
      return;
    }
    if (!changeInstructions.trim()) {
      showToast('Please specify what you want to change in the second box.', 'error');
      return;
    }

    setIsEditing(true);
    try {
      const res = await fetch('/api/prompts/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: inputPrompt, changeInstructions }),
      });
      const data = await res.json();
      if (data.success) {
        setResultData({
          enhancedPrompt: data.enhancedPrompt,
          negativePrompt: data.negativePrompt,
          improvementsMade: data.improvementsMade || [],
          parameters: data.parameters || {},
        });
        showToast('Prompt successfully edited by AI!', 'success');

        saveAiHistoryItem?.({
          id: 'prompt_edit_' + Date.now(),
          type: 'idea_to_prompt',
          title: 'AI Edited Prompt',
          promptText: data.enhancedPrompt,
          negativePrompt: data.negativePrompt,
          camera: data.parameters?.camera,
          lighting: data.parameters?.lighting,
          aspectRatio: data.parameters?.aspectRatio || '16:9',
          tags: ['Prompt Editor', 'AI Edited', changeInstructions.slice(0, 20)],
          createdAt: Date.now(),
        });
      } else {
        showToast(data.error || 'Failed to edit prompt', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while editing prompt', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const copyToClipboard = (text: string, isEnhanced: boolean) => {
    navigator.clipboard.writeText(text);
    if (isEnhanced) {
      setCopiedEnhanced(true);
      setTimeout(() => setCopiedEnhanced(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
    showToast('Copied to clipboard!', 'success');
  };

  const sendToCreateStudio = (promptToUse: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_studio_preload', promptToUse);
      sessionStorage.setItem('promptcms_studio_image_preload', promptToUse);
      sessionStorage.setItem('auraprompt_studio_preload', promptToUse);
    }
    router.push('/create');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E60023]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-red-400">
            <Edit3 className="w-4 h-4" /> AI Prompt Editor & Modifier
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Edit & Customize Any Prompt with AI
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Paste your prompt in the first box and specify your custom changes in the second box. Our AI will precisely edit and transform your prompt while preserving its core style.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: 2 Input Boxes */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xl space-y-6">
          {/* Box 1: Original Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                <FileText className="w-4 h-4 text-[#E60023]" /> 1. Your Prompt (Base Prompt)
              </label>
              <span className="text-xs text-neutral-500 font-medium">
                {inputPrompt.length} chars
              </span>
            </div>
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Paste your prompt here (e.g., 'A cyberpunk street in Tokyo with neon signs')..."
              rows={4}
              className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] text-sm transition-all resize-none shadow-inner"
            />
          </div>

          {/* Quick Sample Prompts */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Quick Sample Prompts:
            </label>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputPrompt(sample)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#E60023] hover:text-white transition-all text-left"
                >
                  {sample.length > 30 ? sample.slice(0, 30) + '...' : sample}
                </button>
              ))}
            </div>
          </div>

          {/* Box 2: What You Want to Change */}
          <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                <Edit3 className="w-4 h-4 text-emerald-500" /> 2. What You Want to Change
              </label>
              <span className="text-xs text-neutral-500 font-medium">
                {changeInstructions.length} chars
              </span>
            </div>
            <textarea
              value={changeInstructions}
              onChange={(e) => setChangeInstructions(e.target.value)}
              placeholder="Write what you want to change (e.g., 'Change time to sunny daytime, add a red flying sports car, and make cinematic')..."
              rows={4}
              className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023] text-sm transition-all resize-none shadow-inner"
            />

            {/* Quick Change Suggestions */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Popular Modifications:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickChangePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (changeInstructions.trim()) {
                        setChangeInstructions(changeInstructions.trim() + ', ' + preset);
                      } else {
                        setChangeInstructions(preset);
                      }
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-emerald-600 hover:text-white transition-all text-left font-medium"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleEditPrompt}
            disabled={isEditing}
            className="w-full py-4 rounded-2xl bg-[#E60023] hover:bg-[#d00020] text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isEditing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> AI is editing your prompt...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Edit Prompt with AI
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Edited Result */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-emerald-500" /> AI Edited Result
              </h2>
              {resultData && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  Successfully Edited
                </span>
              )}
            </div>

            {resultData ? (
              <div className="space-y-6">
                {/* Edited Prompt Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                      Final Edited Prompt:
                    </span>
                    <button
                      onClick={() => copyToClipboard(resultData.enhancedPrompt, true)}
                      className="text-xs px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white transition-colors flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                      {copiedEnhanced ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedEnhanced ? 'Copied!' : 'Copy Edited Prompt'}
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm leading-relaxed font-mono">
                    {resultData.enhancedPrompt}
                  </div>
                </div>

                {/* Negative Prompt */}
                {resultData.negativePrompt && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-red-500">Suggested Negative Prompt:</span>
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-neutral-800 dark:text-neutral-200 text-xs font-mono">
                      {resultData.negativePrompt}
                    </div>
                  </div>
                )}

                {/* Changes Made */}
                {resultData.improvementsMade && resultData.improvementsMade.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Edits Applied:
                    </span>
                    <ul className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                      {resultData.improvementsMade.map((imp, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E60023]" /> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 space-y-3">
                <Cpu className="w-10 h-10 stroke-[1.5] text-neutral-300 dark:text-neutral-700" />
                <p className="text-sm">
                  Provide your prompt and changes on the left and click <span className="font-bold text-neutral-600 dark:text-neutral-300">&ldquo;Edit Prompt with AI&rdquo;</span> to view the edited result here.
                </p>
              </div>
            )}
          </div>

          {resultData && (
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-3">
              <button
                onClick={() => sendToCreateStudio(resultData.enhancedPrompt)}
                className="flex-1 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:bg-[#E60023] dark:hover:bg-[#E60023] dark:hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Open in AI Studio Generator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
