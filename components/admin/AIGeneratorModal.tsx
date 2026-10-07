'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost } from '@/types/prompt';
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  Save,
  RefreshCw,
} from 'lucide-react';

export const AIGeneratorModal = () => {
  const { categories, savePost, setAdminSubView, showToast, copyPromptToClipboard } = useApp();

  const [promptTopic, setPromptTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name || 'Photorealistic & Portraits');
  const [styleMode, setStyleMode] = useState('hyperrealistic');
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!promptTopic.trim()) {
      showToast('Please provide a prompt topic or concept.');
      return;
    }

    setLoading(true);
    setGeneratedData(null);

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_full_post',
          topic: `${promptTopic} (Style: ${styleMode})`,
          tool: 'Gemini',
          category: selectedCategory,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setGeneratedData(json.data);
        showToast('Prompt generated with Gemini AI!');
      } else {
        showToast(json.error || 'Failed to generate with AI');
      }
    } catch (e: any) {
      showToast(e.message || 'Error occurred during AI generation');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishDirectly = () => {
    if (!generatedData) return;

    const slug = (generatedData.title || promptTopic)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newPost: PromptPost = {
      id: `prompt-ai-${Date.now()}`,
      title: generatedData.title || `Prompt: ${promptTopic}`,
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      category: selectedCategory,
      aiTool: 'Midjourney',
      promptText: generatedData.promptText,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      imageAlt: generatedData.title || promptTopic,
      imageFileName: `${slug}.webp`,
      variables: [],
      articleContent: generatedData.articleContent || '## Prompt Guide\n\nGenerated with Gemini Studio.',
      tags: generatedData.tags || [selectedCategory],
      status: 'published',
      viewsCount: 0,
      copiesCount: 0,
      likesCount: 0,
      author: {
        name: 'tool.reelz',
        avatar: '/logo.webp',
        role: 'Author',
      },
      seo: generatedData.seo || {
        metaTitle: `${generatedData.title} | Trending Copy Paste Photo Prompts`,
        metaDescription: `Copy and paste this photo prompt for ${generatedData.title}.`,
        focusKeyword: promptTopic,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    savePost(newPost);
    showToast('Published directly to main domain!');
    setAdminSubView('posts');
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <span>Gemini AI Prompt Studio</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Generate master prompts and full tutorial articles using server-side Gemini AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 5 Cols: Config */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Generation Settings
          </h3>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-bold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Aesthetic Style Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'hyperrealistic', label: 'Photorealistic 8K' },
                { id: 'cinematic', label: 'Cinematic 35mm' },
                { id: 'isometric', label: '3D Isometric Diorama' },
                { id: 'minimalist', label: 'Minimalist Vector' },
                { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                { id: 'editorial', label: 'Vogue Editorial' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setStyleMode(style.id)}
                  className={`p-2 rounded-xl text-xs font-semibold border text-left transition-colors ${
                    styleMode === style.id
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-400'
                      : 'bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Prompt Subject / Concept Idea
            </label>
            <textarea
              rows={4}
              value={promptTopic}
              onChange={(e) => setPromptTopic(e.target.value)}
              placeholder="e.g. Futuristic transparent glass sneaker on a neon floating pedestal with splash water..."
              className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Crafting Master Prompt with Gemini...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Master Prompt Article</span>
              </>
            )}
          </button>
        </div>

        {/* Right 7 Cols: Live Result & 1-Click Publishing */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          {generatedData ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Prompt Generated Successfully</span>
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {selectedCategory}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {generatedData.title}
                </h3>
              </div>

              {/* Master Prompt Output */}
              <div className="p-4 rounded-2xl bg-neutral-950 text-neutral-100 font-mono text-xs leading-relaxed border border-neutral-800 space-y-3">
                <p className="whitespace-pre-wrap select-all">{generatedData.promptText}</p>
                <div className="pt-2 border-t border-neutral-800 flex justify-end">
                  <button
                    onClick={() => {
                      copyPromptToClipboard(generatedData.promptText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                </div>
              </div>

              {/* Publish Action Button */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Ready to show on the main website?
                </span>
                <button
                  onClick={handlePublishDirectly}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>1-Click Publish to Live Domain</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-neutral-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-neutral-400" />
              </div>
              <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                AI Generation Studio Idle
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm">
                Enter your prompt idea on the left to generate a production-ready prompt article.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
