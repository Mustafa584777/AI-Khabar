'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost, Category } from '@/types/prompt';
import {
  Save,
  Globe,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  ArrowLeft,
  Wand2,
  FileText,
  Search,
  RefreshCw,
  Upload,
  Link as LinkIcon,
  FileUp,
  RotateCcw,
  Loader2,
  Tag,
  Plus,
  X,
  Check,
} from 'lucide-react';
import Image from 'next/image';

const generateImageFileNameFromTitle = (titleText: string, currentFileName?: string): string => {
  const fallback = 'photo-prompt.webp';
  if (!titleText || !titleText.trim()) {
    return currentFileName || fallback;
  }
  const cleanSlug = titleText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  let ext = 'webp';
  if (currentFileName && currentFileName.includes('.')) {
    const parts = currentFileName.split('.');
    const detectedExt = parts[parts.length - 1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(detectedExt)) {
      ext = detectedExt === 'jpeg' ? 'jpg' : detectedExt;
    }
  }
  return `${cleanSlug || 'photo-prompt'}.${ext}`;
};

const detectCategoryFromText = (text: string): string => {
  const t = (text || '').toLowerCase();
  if (t.includes('cyber') || t.includes('sci-fi') || t.includes('robot') || t.includes('future') || t.includes('mecha')) return 'Sci-Fi & Cyberpunk';
  if (t.includes('anime') || t.includes('manga') || t.includes('ghibli') || t.includes('chibi') || t.includes('otaku')) return 'Anime & Manga';
  if (t.includes('car') || t.includes('vehicle') || t.includes('supercar') || t.includes('auto') || t.includes('bike')) return 'Vehicles & Automotive';
  if (t.includes('architecture') || t.includes('interior') || t.includes('room') || t.includes('villa') || t.includes('building')) return 'Architecture & Interiors';
  if (t.includes('nature') || t.includes('animal') || t.includes('landscape') || t.includes('forest') || t.includes('ocean') || t.includes('wildlife')) return 'Landscapes & Nature';
  if (t.includes('logo') || t.includes('vector') || t.includes('icon') || t.includes('branding') || t.includes('sticker')) return 'Logos & Graphic Design';
  if (t.includes('3d') || t.includes('render') || t.includes('blender') || t.includes('cgi') || t.includes('unreal') || t.includes('isometric')) return '3D Art & CGI';
  if (t.includes('fantasy') || t.includes('dragon') || t.includes('magic') || t.includes('myth') || t.includes('fairy')) return 'Fantasy & Mythological';
  if (t.includes('vintage') || t.includes('35mm') || t.includes('retro') || t.includes('analog') || t.includes('film')) return 'Photography & Vintage';
  if (t.includes('fashion') || t.includes('outfit') || t.includes('streetwear') || t.includes('dress') || t.includes('runway')) return 'Fashion & Apparel';
  return 'Photorealistic & Portraits';
};

export const PostEditor = () => {
  const {
    posts,
    savePost,
    categories,
    saveCategory,
    editingPostId,
    setEditingPostId,
    setAdminSubView,
    setCurrentView,
    setSelectedPost,
    showToast,
  } = useApp();

  const isEditing = Boolean(editingPostId);
  const existingPost = editingPostId ? posts.find((p) => p.id === editingPostId) : null;

  // Form State
  const [title, setTitle] = useState(() => existingPost?.title || '');
  const [slug, setSlug] = useState(() => existingPost?.slug || '');
  const [category, setCategory] = useState(
    () => existingPost?.category || (existingPost?.title ? detectCategoryFromText(existingPost.title) : (categories[0]?.name || 'Photorealistic & Portraits'))
  );
  const [promptText, setPromptText] = useState(() => existingPost?.promptText || '');
  const [imageUrl, setImageUrl] = useState(
    () => existingPost?.imageUrl || ''
  );
  const [imageAlt, setImageAlt] = useState(
    () => existingPost?.imageAlt || (existingPost?.title || '')
  );
  const [imageFileName, setImageFileName] = useState(
    () => existingPost?.imageFileName || (existingPost?.title ? generateImageFileNameFromTitle(existingPost.title) : '')
  );
  const [imageSourceTab, setImageSourceTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<'published' | 'draft'>(
    () => (existingPost?.status === 'draft' ? 'draft' : 'published')
  );
  const [articleContent, setArticleContent] = useState(
    () =>
      existingPost?.articleContent ||
      '## How to Use This Prompt\n\nRun this prompt in your favorite AI image generator to produce photorealistic results.'
  );
  
  // Interactive Tags Array State
  const [tags, setTags] = useState<string[]>(() => {
    if (existingPost?.tags && existingPost.tags.length > 0) {
      return existingPost.tags;
    }
    return ['AI Prompt', 'Photorealistic', 'Masterpiece'];
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [isAutoTaxonomyRunning, setIsAutoTaxonomyRunning] = useState(false);
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<string | null>(null);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');

  const handleCreateAndAssignCategory = async (rawCatName: string) => {
    const trimmed = rawCatName.trim();
    if (!trimmed) return;
    
    // Check if already exists in categories
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setCategory(existing.name);
      setCustomCatInput('');
      setIsAddingCustomCat(false);
      showToast(`Selected existing category: "${existing.name}"`);
      return;
    }

    const cleanSlug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;

    const newCategory: Category = {
      id: `cat-${cleanSlug}-${Date.now().toString(36)}`,
      name: trimmed,
      slug: cleanSlug,
      iconName: 'Sparkles',
      description: `Curated collection of ${trimmed} copy-paste AI photo prompts.`,
      color: '#E60023',
      badgeBg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
      count: 1,
    };

    try {
      await saveCategory(newCategory);
      setCategory(trimmed);
      setCustomCatInput('');
      setIsAddingCustomCat(false);
      showToast(`Created and assigned new category: "${trimmed}"`);
    } catch (e: any) {
      setCategory(trimmed);
      showToast(`Assigned category: "${trimmed}"`);
    }
  };

  // SEO Meta
  const [metaTitle, setMetaTitle] = useState(() => existingPost?.seo?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(
    () => existingPost?.seo?.metaDescription || ''
  );
  const [focusKeyword, setFocusKeyword] = useState(
    () => existingPost?.seo?.focusKeyword || ''
  );

  // AI Taxonomy Auto-Detection: manages Category and Tags automatically from Title/Prompt/Image
  const handleAutoTaxonomy = async (customTitle?: string, customPrompt?: string) => {
    const activeTitle = (customTitle ?? title).trim();
    const activePrompt = (customPrompt ?? promptText).trim();

    if (!activeTitle && !activePrompt && !imageUrl) {
      showToast('Please enter a title, prompt text, or upload an image first');
      return;
    }

    setIsAutoTaxonomyRunning(true);
    try {
      const res = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_categorize_and_tag',
          title: activeTitle,
          promptText: activePrompt,
          categories: categories.map((c) => c.name),
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const { category: detectedCat, tags: detectedTags, metaDescription: detectedDesc } = data.data;
        if (detectedCat) {
          const incomingCat = detectedCat.trim();
          const existing = categories.find(
            (c) =>
              c.name.toLowerCase() === incomingCat.toLowerCase() ||
              c.slug.toLowerCase() === incomingCat.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          );
          if (existing) {
            setCategory(existing.name);
          } else if (incomingCat) {
            await handleCreateAndAssignCategory(incomingCat);
          }
          setAiSuggestedCategory(incomingCat);
        }
        if (Array.isArray(detectedTags) && detectedTags.length > 0) {
          const activeCatLower = (detectedCat || category).trim().toLowerCase();
          setTags((prev) => {
            const seen = new Set<string>();
            const result: string[] = [];
            for (const t of [...detectedTags, ...prev]) {
              const trimmed = String(t).trim().replace(/^#/, '');
              if (!trimmed) continue;
              const lower = trimmed.toLowerCase();
              if (lower === activeCatLower) continue;
              if (!seen.has(lower)) {
                seen.add(lower);
                result.push(trimmed);
              }
            }
            return result.slice(0, 12);
          });
          setAiSuggestedTags(detectedTags);
        }
        if (detectedDesc && !metaDescription) {
          setMetaDescription(detectedDesc);
        }
        showToast(`AI Auto-Assigned Category "${detectedCat}" & ${detectedTags?.length || 0} tags`);
      }
    } catch (err) {
      console.error('Auto taxonomy failed:', err);
    } finally {
      setIsAutoTaxonomyRunning(false);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    const lower = trimmed.toLowerCase();
    if (trimmed && !tags.some((t) => t.toLowerCase() === lower)) {
      setTags((prev) => [...prev, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [autoFillMode, setAutoFillMode] = useState<'title' | 'image'>('image');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Manual File Upload Handler
  const [isSavingPost, setIsSavingPost] = useState(false);

  const optimizeImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          resolve('');
          return;
        }

        const img = document.createElement('img');
        img.onload = () => {
          const maxDimension = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          resolve(compressed);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP, GIF, AVIF).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('File size exceeds 15MB limit.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const optimized = await optimizeImageFile(file);
      if (optimized) {
        let finalImageUrl = optimized;
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: optimized }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData && uploadData.url) {
            finalImageUrl = uploadData.url;
            if (uploadData.provider === 'cloudinary') {
              showToast('Image uploaded to Cloudinary CDN successfully!');
            } else {
              showToast('Image optimized and attached to prompt!');
            }
          } else {
            showToast('Image processed and attached locally!');
          }
        } catch {
          showToast('Image processed and attached locally!');
        }

        setImageUrl(finalImageUrl);

        const formattedSize =
          file.size / 1024 < 1024
            ? `${Math.round(file.size / 1024)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        setUploadedFileInfo({
          name: file.name,
          size: formattedSize,
        });

        // Auto-set alt text and filename from Title
        const autoAlt = title.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
        setImageAlt(autoAlt);

        const autoFileName = generateImageFileNameFromTitle(title || file.name, file.name);
        setImageFileName(autoFileName);

        // Auto-assign category & tags if title or prompt is present
        if (title.trim() || promptText.trim()) {
          handleAutoTaxonomy();
        }
      }
    } catch {
      showToast('Failed to process image file');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSyncImageMetaFromTitle = () => {
    if (!title.trim()) {
      showToast('Please enter a post title first.');
      return;
    }
    const cleanAlt = title.trim();
    const cleanFileName = generateImageFileNameFromTitle(title, imageFileName);
    setImageAlt(cleanAlt);
    setImageFileName(cleanFileName);
    showToast('Image Alt Text and File Name refreshed from Title!');
  };

  // Auto-generate slug from title if not custom
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    const generatedSlug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!isEditing || !slug) {
      setSlug(generatedSlug);
    }
    if (!metaTitle) {
      setMetaTitle(`${newTitle} | Trending Copy Paste Photo Prompts`);
    }

    // Auto-update category based on title keywords
    const dynamicCat = detectCategoryFromText(newTitle);
    if (dynamicCat) {
      setCategory(dynamicCat);
    }

    // Auto-update alt text and file name from title if matching or empty
    if (!imageAlt || imageAlt === title) {
      setImageAlt(newTitle);
    }
    if (!imageFileName || imageFileName.startsWith(slug) || imageFileName === 'photo-prompt.webp') {
      setImageFileName(generateImageFileNameFromTitle(newTitle, imageFileName));
    }
  };

  // AI Copilot generation via Gemini server API with multi-model fallback & vision
  const handleGenerateWithAi = async () => {
    const effectiveTopic = aiTopic.trim() || title.trim();

    if (autoFillMode === 'title' && !effectiveTopic) {
      showToast('Please enter a Title or Prompt Concept for AI auto-fill');
      return;
    }

    if (autoFillMode === 'image' && !imageUrl) {
      showToast('Please upload or select a Featured Image first to auto-fill from image');
      return;
    }

    setIsAiGenerating(true);
    showToast(
      autoFillMode === 'image'
        ? 'Gemini Vision is analyzing the uploaded image...'
        : 'Gemini is generating full prompt fields...'
    );

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_full_post',
          mode: autoFillMode,
          topic: effectiveTopic || 'Photorealistic Artwork Recreation',
          image: autoFillMode === 'image' ? imageUrl : undefined,
          tool: 'Gemini',
          category,
          categories: categories.map((c) => c.name),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const newTitle = data.title || (autoFillMode === 'title' ? effectiveTopic : title);
        
        if (newTitle) {
          setTitle(newTitle);
          setImageAlt(newTitle);
          setImageFileName(generateImageFileNameFromTitle(newTitle, imageFileName));
        }

        if (data.slug) setSlug(data.slug);
        if (data.promptText) setPromptText(data.promptText);

        // Smart Category Assignment & Auto-Creation without Duplication
        let activeCategoryName = category;
        if (data.category && typeof data.category === 'string') {
          const incomingCat = data.category.trim();
          const existing = categories.find(
            (c) =>
              c.name.toLowerCase() === incomingCat.toLowerCase() ||
              c.slug.toLowerCase() === incomingCat.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          );
          if (existing) {
            setCategory(existing.name);
            activeCategoryName = existing.name;
          } else if (incomingCat) {
            await handleCreateAndAssignCategory(incomingCat);
            activeCategoryName = incomingCat;
          }
          setAiSuggestedCategory(incomingCat);
        }

        // Tag Deduplication
        if (data.tags && Array.isArray(data.tags)) {
          const activeCatLower = activeCategoryName.toLowerCase();
          const seen = new Set<string>();
          const cleanTags: string[] = [];
          for (const t of data.tags) {
            const trimmed = String(t).trim().replace(/^#/, '');
            if (!trimmed) continue;
            const lower = trimmed.toLowerCase();
            if (lower === activeCatLower) continue;
            if (!seen.has(lower)) {
              seen.add(lower);
              cleanTags.push(trimmed);
            }
          }
          setTags(cleanTags.slice(0, 12));
        }

        if (data.articleContent) {
          setArticleContent(data.articleContent);
        }

        if (data.seo) {
          setMetaTitle(data.seo.metaTitle || `${newTitle} | Trending Copy Paste Photo Prompts`);
          setMetaDescription(data.seo.metaDescription || '');
          setFocusKeyword(data.seo.focusKeyword || newTitle);
        }

        const modelNote = json.modelUsed ? ` (via ${json.modelUsed})` : '';
        showToast(`Auto-filled prompt fields successfully${modelNote}!`);
      } else {
        showToast(json.error || 'Failed to generate prompt');
      }
    } catch (e: any) {
      showToast(e.message || 'AI request failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSave = async (publishStatus: 'published' | 'draft') => {
    if (!title.trim() || !promptText.trim()) {
      showToast('Title and Prompt Text are required.');
      return;
    }

    const finalAlt = imageAlt.trim() || title.trim() || 'AI Photo Prompt';
    const finalFileName = imageFileName.trim() || generateImageFileNameFromTitle(title, imageFileName);

    const chosenCat = (category || categories[0]?.name || 'Photorealistic & Portraits').trim();

    // Auto-create category in DB & context if not existing
    if (chosenCat && !categories.some((c) => c.name.toLowerCase() === chosenCat.toLowerCase())) {
      const cleanSlug = chosenCat
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;

      const newCategory: Category = {
        id: `cat-${cleanSlug}-${Date.now().toString(36)}`,
        name: chosenCat,
        slug: cleanSlug,
        iconName: 'Sparkles',
        description: `Curated collection of ${chosenCat} copy-paste AI photo prompts.`,
        color: '#E60023',
        badgeBg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
        count: 1,
      };

      try {
        await saveCategory(newCategory);
      } catch (e) {
        console.warn('Auto category save error:', e);
      }
    }

    const postPayload: PromptPost = {
      id: existingPost ? existingPost.id : `prompt-${Date.now()}`,
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: chosenCat,
      aiTool: 'ChatGPT',
      promptText,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      imageAlt: finalAlt,
      imageFileName: finalFileName,
      variables: [],
      articleContent,
      tags: tags.length > 0 ? tags : [chosenCat || 'AI Prompt'],
      status: publishStatus,
      viewsCount: existingPost?.viewsCount || 0,
      copiesCount: existingPost?.copiesCount || 0,
      likesCount: existingPost?.likesCount || 0,
      author: {
        name: 'tool.reelz',
        avatar: '/logo.png',
        role: 'Author',
      },
      seo: {
        metaTitle: metaTitle || `${title} | Trending Copy Paste Photo Prompts`,
        metaDescription: metaDescription || `Copy and paste this photo prompt for ${title}.`,
        focusKeyword: focusKeyword || title,
      },
      createdAt: existingPost?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt:
        publishStatus === 'published'
          ? existingPost?.publishedAt || new Date().toISOString()
          : undefined,
    };

    setIsSavingPost(true);
    try {
      const saved = await savePost(postPayload);
      setEditingPostId(null);
      setAdminSubView('posts');
    } catch (err: any) {
      showToast(err.message || 'Failed to save prompt');
    } finally {
      setIsSavingPost(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingPostId(null);
              setAdminSubView('posts');
            }}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {isEditing ? 'Edit Prompt Article' : 'Create New Prompt Article'}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Author: <span className="font-semibold text-neutral-800 dark:text-neutral-200">tool.reelz</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSavingPost}
            onClick={() => handleSave('draft')}
            className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isSavingPost ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            disabled={isSavingPost}
            onClick={() => handleSave('published')}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-colors disabled:opacity-50"
            id="btn-publish-prompt-article"
          >
            {isSavingPost ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSavingPost ? 'Saving to Server...' : isEditing ? 'Update & Publish' : 'Publish to Main Domain'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Image Upload, Gemini AI Auto-Fill, Title & Prompt Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Featured Image Management: Manual Upload & Direct URL (Above Title) */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Featured Image & Media</span>
              </h3>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setUploadedFileInfo(null);
                  }}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-600 hover:underline"
                >
                  Clear Image
                </button>
              )}
            </div>

            {/* Upload Method Switcher Tabs (Only Manual Upload and Direct URL) */}
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageSourceTab('upload')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  imageSourceTab === 'upload'
                    ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Manual Upload</span>
              </button>
              <button
                type="button"
                onClick={() => setImageSourceTab('url')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  imageSourceTab === 'url'
                    ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Image URL</span>
              </button>
            </div>

            {/* TAB 1: Manual File Upload (Drag & Drop + File Picker) */}
            {imageSourceTab === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="admin-image-file-input"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                  className={`relative p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 scale-[0.99]'
                      : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-950/50 hover:border-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-950'
                  } ${isUploadingImage ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isUploadingImage ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">
                        Uploading & Optimizing Photo...
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Please wait a moment
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <FileUp className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white mb-1">
                        Click to browse or drag & drop photo
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        PNG, JPG, WebP, AVIF or GIF (up to 15MB)
                      </p>
                      {uploadedFileInfo && (
                        <div className="mt-3 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{uploadedFileInfo.name}</span>
                          <span>({uploadedFileInfo.size})</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Direct Image URL */}
            {imageSourceTab === 'url' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Direct Image Link (CDN, Unsplash, Imgur)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (!imageAlt) setImageAlt(title);
                    if (!imageFileName) setImageFileName(generateImageFileNameFromTitle(title));
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono"
                />
              </div>
            )}

            {/* Active Image Preview Card */}
            {imageUrl && (
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                  <span>Current Preview</span>
                  <span className="text-blue-600 dark:text-blue-400">Live Aspect Ratio 16:10</span>
                </div>
                <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-inner group">
                  <Image
                    src={imageUrl}
                    alt={imageAlt || title || 'Preview'}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white text-neutral-900 text-xs font-bold shadow-md hover:bg-neutral-100"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setUploadedFileInfo(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image SEO: Alt Text & File Name (Auto-derived from Title) */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Image SEO & Accessibility Meta</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncImageMetaFromTitle}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  title="Auto-fill Alt Text and File Name from the post title"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Sync from Title</span>
                </button>
              </div>

              {/* Alt Text Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Alt Text (Title Auto-Fill)
                  </label>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    SEO Essential
                  </span>
                </div>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder={title || 'e.g. Cinematic 8K Golden Hour Portrait...'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Automatically set to prompt title prior to publishing for Google Image SEO.
                </p>
              </div>

              {/* Image File Name Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Image File Name (Clean Slug)
                  </label>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    Canonical
                  </span>
                </div>
                <input
                  type="text"
                  value={imageFileName}
                  onChange={(e) => setImageFileName(e.target.value)}
                  placeholder={generateImageFileNameFromTitle(title || 'photo-prompt')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono text-[11px]"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Normalized filename slug derived from title for optimal CDN indexing.
                </p>
              </div>
            </div>
          </div>

          {/* Gemini AI Prompt Copilot Widget (Above Title) */}
          <div className="bg-gradient-to-br from-indigo-950/80 via-neutral-900 to-purple-950/80 p-6 rounded-3xl border border-indigo-800/60 shadow-xl text-white space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gemini AI Auto-Fill</h3>
                  <p className="text-[10px] text-indigo-300">
                    Smart prompt creation with multi-model fallback
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Active
              </span>
            </div>

            {/* Auto-Fill Source Selection Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-indigo-200 mb-1.5 flex items-center justify-between">
                <span>Auto-Fill Source</span>
                <span className="text-[10px] text-indigo-400 font-normal">Choose mode</span>
              </label>
              <select
                value={autoFillMode}
                onChange={(e) => setAutoFillMode(e.target.value as 'title' | 'image')}
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-neutral-950 border border-indigo-700/60 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="image">Fill details based on Uploaded Image (Recommended)</option>
                <option value="title">Fill details based on Title / Concept</option>
              </select>
            </div>

            {/* Title / Concept Input Mode */}
            {autoFillMode === 'title' && (
              <div>
                <label className="block text-[11px] font-bold text-indigo-200 mb-1">
                  Prompt Concept / Subject
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder={title.trim() ? `Using title: "${title.trim().slice(0, 30)}..."` : 'e.g. Cyberpunk samurai cat in neon Tokyo rain...'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-indigo-700/60 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-indigo-400 mt-1">
                  Leave blank to use post title automatically.
                </p>
              </div>
            )}

            {/* Uploaded Image Mode Status */}
            {autoFillMode === 'image' && (
              <div className="p-3 rounded-xl bg-neutral-950/80 border border-indigo-700/50 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-200">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Uploaded Image Status
                  </span>
                  {imageUrl ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                      Ready
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                      Image Needed
                    </span>
                  )}
                </div>

                {imageUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-indigo-700 relative bg-neutral-900">
                      <Image
                        src={imageUrl}
                        alt="Uploaded preview"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-[11px] text-neutral-300 leading-tight">
                      <p className="font-semibold text-white truncate max-w-[140px]">
                        {uploadedFileInfo?.name || 'Featured Photo'}
                      </p>
                      <p className="text-[10px] text-indigo-300 mt-0.5">
                        Gemini Vision will reverse-engineer lighting, optics, and subject.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-[11px] text-neutral-400 mb-2">
                      No featured photo selected yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={isAiGenerating}
              onClick={handleGenerateWithAi}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAiGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {autoFillMode === 'image'
                      ? 'Analyzing Image with Gemini...'
                      : 'Generating with Gemini...'}
                  </span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {autoFillMode === 'image'
                      ? 'Auto-Fill Fields from Image'
                      : 'Auto-Fill All Post Fields'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Post Title */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Article & Prompt Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Cinematic 8K Golden Hour Portrait with Hasselblad 50mm Lens..."
              className="w-full text-lg sm:text-xl font-bold px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Master Prompt Box */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Primary Copy-Paste Prompt
                </h3>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              Enter the full ready-to-run prompt text with subjects, style descriptors, lighting instructions, and camera parameters.
            </p>

            <textarea
              rows={6}
              required
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Close-up editorial portrait of a young model with intricate facial details, cinematic lighting, 85mm lens, 8k --ar 16:9 --v 6.1"
              className="w-full p-4 rounded-2xl bg-neutral-950 text-neutral-100 border border-neutral-800 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right 1 Column: Categories & Taxonomy, SEO Meta Settings */}
        <div className="space-y-6">
          {/* Category & AI Taxonomy Manager */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#E60023]" />
                  <span>Category & Smart Tags</span>
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  AI auto-manages category & tags. You retain 100% control to edit, modify, or remove.
                </p>
              </div>
              <button
                type="button"
                disabled={isAutoTaxonomyRunning}
                onClick={() => handleAutoTaxonomy()}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E60023] to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-[11px] font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="AI auto-determines category & tags from title/prompt"
              >
                {isAutoTaxonomyRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Auto-Assigning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Auto-Detect</span>
                  </>
                )}
              </button>
            </div>

            {/* Category Selection & Fast Auto-Create */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Category
                </label>
                <div className="flex items-center gap-2">
                  {aiSuggestedCategory && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> AI Matched
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCat(!isAddingCustomCat)}
                    className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    {isAddingCustomCat ? 'Select Existing' : '+ New Category'}
                  </button>
                </div>
              </div>

              {!isAddingCustomCat ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customCatInput}
                      onChange={(e) => setCustomCatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateAndAssignCategory(customCatInput);
                        }
                      }}
                      placeholder="Type new category name..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateAndAssignCategory(customCatInput)}
                      className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Create & Assign
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Will be auto-created in categories database and assigned to this prompt.
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Tags Manager */}
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Assigned Tags ({tags.length})</span>
                </label>
                {tags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTags([])}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-600 hover:underline"
                  >
                    Remove All
                  </button>
                )}
              </div>

              {/* Tag Pills Display with Delete (X) */}
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                {tags.length === 0 ? (
                  <span className="text-[11px] text-neutral-400 italic self-center px-1">
                    No tags added yet. Click &quot;AI Auto-Detect&quot; or type a tag below.
                  </span>
                ) : (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-2xs group hover:border-red-300 dark:hover:border-red-800 transition-colors"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title={`Remove tag ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Custom Tag Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag(newTagInput);
                    }
                  }}
                  placeholder="Type a tag & press Enter or Comma..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(newTagInput)}
                  disabled={!newTagInput.trim()}
                  className="px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </button>
              </div>

              {/* Quick AI Suggestions & Recommended Tag Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Quick Add Suggested Tags:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '8K',
                    'Cinematic',
                    'Photorealistic',
                    'Portrait',
                    'Studio Lighting',
                    'Anime',
                    'Cyberpunk',
                    'Hyperrealistic',
                    'Unreal Engine 5',
                    'Vintage 35mm',
                    ...(aiSuggestedTags || []),
                  ]
                    .filter((t, index, self) => self.indexOf(t) === index && !tags.includes(t))
                    .slice(0, 8)
                    .map((suggested) => (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => handleAddTag(suggested)}
                        className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white text-neutral-600 dark:text-neutral-300 text-[10px] font-semibold transition-colors flex items-center gap-1 border border-neutral-200/60 dark:border-neutral-700/60"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{suggested}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* SEO Meta Box */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              <span>SEO Meta Settings</span>
            </h3>

            {/* Google SERP Snippet Preview */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Google Search Preview
              </span>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">
                {metaTitle || `${title || 'Prompt Title'} | Trending Copy Paste Photo Prompts`}
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-500 font-mono truncate">
                https://trendinggeminiprompts.com/prompt/{slug || 'sample-prompt'}
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                {metaDescription || `Copy and paste this photo prompt for ${title}.`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                SEO Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Enter title under 60 chars..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                SEO Meta Description
              </label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Enter meta description under 160 chars..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Focus Keyword
              </label>
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g. photorealistic portrait prompt"
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
