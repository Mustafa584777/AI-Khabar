'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost, Category } from '@/types/prompt';
import {
  Download,
  Upload,
  Database,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileArchive,
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
  Eye,
  Info,
  Check,
  Package,
} from 'lucide-react';
import Image from 'next/image';
import JSZip from 'jszip';

interface ParsedBackupData {
  version?: string;
  exportedAt?: string;
  totalPrompts: number;
  posts: PromptPost[];
  categories?: Category[];
  tags?: string[];
  filename?: string;
  fileType: 'zip';
  fileSize?: string;
}

export const BackupRestoreView = () => {
  const { posts, categories, tags, settings, restorePromptCards, showToast, refreshData } = useApp();

  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [parsedBackup, setParsedBackup] = useState<ParsedBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [restoreSuccessCount, setRestoreSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to normalize any incoming array/object of prompts
  const normalizeIncomingPosts = (rawList: any[]): PromptPost[] => {
    return rawList
      .map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return null;
        const promptText = (
          item.promptText ||
          item.prompt ||
          item.text ||
          item.content ||
          item.body ||
          item.description ||
          ''
        )
          .toString()
          .trim();
        const title = (
          item.title ||
          item.name ||
          item.heading ||
          item.subject ||
          (promptText ? promptText.slice(0, 45) : `Prompt #${idx + 1}`)
        )
          .toString()
          .trim();

        if (!promptText && !title) return null;

        const rawId = item.id || item._id || `prompt-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
        const safeId = String(rawId).replace(/[\/\s#?\[\]]+/g, '_').slice(0, 100);
        const category = (
          item.category ||
          item.cat ||
          (Array.isArray(item.categories) ? item.categories[0] : null) ||
          'General'
        ).toString();
        const aiTool = (item.aiTool || item.tool || item.model || 'ChatGPT').toString();
        const imageUrl = (
          item.imageUrl ||
          item.image ||
          item.img ||
          item.thumbnail ||
          item.photo ||
          ''
        ).toString();

        let postTags: string[] = [];
        if (Array.isArray(item.tags)) {
          postTags = item.tags.map((t: any) => String(t).trim()).filter(Boolean);
        } else if (typeof item.tags === 'string') {
          postTags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        if (postTags.length === 0) postTags = ['AI Prompt'];

        return {
          id: safeId,
          title: title || 'Untitled Prompt',
          slug: item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          category,
          aiTool,
          promptText: promptText || title,
          negativePrompt: (item.negativePrompt || item.negative || '').toString(),
          imageUrl,
          imageAlt: (item.imageAlt || title).toString(),
          imageFileName: item.imageFileName,
          additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [],
          parameters: typeof item.parameters === 'object' && item.parameters ? item.parameters : {},
          variables: Array.isArray(item.variables) ? item.variables : [],
          articleContent: (item.articleContent || item.article || '').toString(),
          tags: postTags,
          status: item.status === 'draft' ? 'draft' : 'published',
          isFeatured: Boolean(item.isFeatured),
          isTrending: Boolean(item.isTrending),
          viewsCount: Number(item.viewsCount) || 0,
          copiesCount: Number(item.copiesCount) || 0,
          likesCount: Number(item.likesCount) || 0,
          author: {
            name: 'tool.reelz',
            avatar: '/logo.png',
            role: 'Author',
          },
          seo: item.seo || {
            metaTitle: title,
            metaDescription: promptText.substring(0, 155),
            focusKeyword: category || 'AI Prompt',
          },
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: item.publishedAt || new Date().toISOString(),
        } as PromptPost;
      })
      .filter((p): p is PromptPost => p !== null && p.title.length > 0 && p.promptText.length > 0);
  };

  // 1. Export as ZIP Package
  const handleDownloadZipBackup = async () => {
    try {
      setIsExportingZip(true);
      let allPosts = posts;
      let allCategories = categories;
      let allTags = tags;
      let allSettings = settings;

      try {
        const res = await fetch('/api/backup', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.posts)) allPosts = data.posts;
          if (Array.isArray(data.categories)) allCategories = data.categories;
          if (Array.isArray(data.tags)) allTags = data.tags;
          if (data.settings) allSettings = data.settings;
        }
      } catch {
        // use fallback context data
      }

      const zip = new JSZip();
      const dateStr = new Date().toISOString().slice(0, 10);

      // 1. JSON Data Files
      zip.file('prompts.json', JSON.stringify(allPosts, null, 2));
      zip.file('categories.json', JSON.stringify(allCategories, null, 2));
      zip.file('tags.json', JSON.stringify(allTags, null, 2));
      zip.file('settings.json', JSON.stringify(allSettings, null, 2));

      // 2. Metadata Manifest
      const manifest = {
        name: 'PromptCMS Full Backup Archive',
        site: 'tool.reelz',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        totalPrompts: allPosts.length,
        totalCategories: allCategories.length,
        totalTags: allTags.length,
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // 3. Prompts Text Folder with individual readable prompt files
      const textFolder = zip.folder('prompts_text');
      if (textFolder) {
        allPosts.forEach((post, i) => {
          const safeSlug = (post.slug || `prompt-${i + 1}`).slice(0, 40);
          const filename = `${String(i + 1).padStart(3, '0')}-${safeSlug}.txt`;
          const content = `TITLE: ${post.title}
CATEGORY: ${post.category}
AI TOOL: ${post.aiTool}
TAGS: ${(post.tags || []).join(', ')}
DATE: ${post.createdAt}
IMAGE URL: ${post.imageUrl || 'None'}

--- MASTER PROMPT ---
${post.promptText}

--- NEGATIVE PROMPT ---
${post.negativePrompt || 'None'}
`;
          textFolder.file(filename, content);
        });
      }

      // 4. README guide
      zip.file(
        'README.txt',
        `PromptCMS Backup Archive
Exported: ${new Date().toLocaleString()}
Total Prompts: ${allPosts.length}

Contents:
- prompts.json: Main database dump of all prompt cards
- categories.json: List of all categories
- tags.json: List of all tags
- settings.json: Site settings
- prompts_text/: Plain text files for each individual prompt

To restore:
Open Admin Panel -> Backup & Restore -> Upload this .zip file or prompts.json.`
      );

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `promptcms-full-backup-${dateStr}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      showToast(`Full ZIP backup downloaded! (${allPosts.length} prompts)`);
    } catch (err: any) {
      console.error('ZIP export failed:', err);
      showToast('Failed to generate ZIP backup');
    } finally {
      setIsExportingZip(false);
    }
  };

  // 2. Process Uploaded ZIP File
  const handleFileSelect = async (file: File) => {
    setParseError(null);
    setRestoreSuccessCount(null);

    const isZip = file.name.endsWith('.zip') || file.type.includes('zip') || file.type.includes('octet-stream');

    if (!isZip) {
      setParseError('Please upload a valid .zip backup archive.');
      return;
    }

    const fileSizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);

      let promptsJsonStr: string | null = null;
      let categoriesJsonStr: string | null = null;
      let tagsJsonStr: string | null = null;

      // Search for prompts.json, backup.json, or any .json file inside zip
      const candidateFiles = Object.keys(zipData.files).filter((k) => !zipData.files[k].dir);

      for (const filename of candidateFiles) {
        const lower = filename.toLowerCase();
        if (lower.endsWith('prompts.json') || lower.endsWith('backup.json') || lower.endsWith('data.json')) {
          promptsJsonStr = await zipData.files[filename].async('string');
          break;
        }
      }

      // If not found by specific name, find first valid json
      if (!promptsJsonStr) {
        for (const filename of candidateFiles) {
          if (filename.toLowerCase().endsWith('.json') && !filename.toLowerCase().includes('manifest')) {
            promptsJsonStr = await zipData.files[filename].async('string');
            break;
          }
        }
      }

      // Check for categories & tags
      for (const filename of candidateFiles) {
        const lower = filename.toLowerCase();
        if (lower.endsWith('categories.json')) {
          categoriesJsonStr = await zipData.files[filename].async('string');
        }
        if (lower.endsWith('tags.json')) {
          tagsJsonStr = await zipData.files[filename].async('string');
        }
      }

      let rawPosts: any[] = [];
      if (promptsJsonStr) {
        const parsed = JSON.parse(promptsJsonStr);
        if (Array.isArray(parsed)) rawPosts = parsed;
        else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.posts)) rawPosts = parsed.posts;
          else if (Array.isArray(parsed.prompts)) rawPosts = parsed.prompts;
          else if (Array.isArray(parsed.data)) rawPosts = parsed.data;
          else if (Array.isArray(parsed.items)) rawPosts = parsed.items;
          else rawPosts = Object.values(parsed);
        }
      } else {
        // Parse plain text files from zip if no JSON exists
        const txtFiles = candidateFiles.filter((k) => k.endsWith('.txt') && !k.toLowerCase().includes('readme'));
        for (const txtFile of txtFiles) {
          const content = await zipData.files[txtFile].async('string');
          const lines = content.split('\n');
          let title = txtFile.replace(/\.txt$/, '').replace(/^\d+[-_]/, '');
          let promptText = '';
          let category = 'General';
          let tool = 'ChatGPT';

          for (const line of lines) {
            if (line.startsWith('TITLE:')) title = line.replace('TITLE:', '').trim();
            if (line.startsWith('CATEGORY:')) category = line.replace('CATEGORY:', '').trim();
            if (line.startsWith('AI TOOL:')) tool = line.replace('AI TOOL:', '').trim();
          }

          const promptIdx = content.indexOf('--- MASTER PROMPT ---');
          if (promptIdx !== -1) {
            const after = content.slice(promptIdx + '--- MASTER PROMPT ---'.length);
            const negIdx = after.indexOf('--- NEGATIVE PROMPT ---');
            promptText = (negIdx !== -1 ? after.slice(0, negIdx) : after).trim();
          } else {
            promptText = content;
          }

          if (promptText) {
            rawPosts.push({ title, promptText, category, aiTool: tool });
          }
        }
      }

      const validPosts = normalizeIncomingPosts(rawPosts);

      if (validPosts.length === 0) {
        setParseError('Could not find any readable prompt cards in the uploaded .zip archive.');
        setParsedBackup(null);
        return;
      }

      let parsedCategories: Category[] | undefined;
      if (categoriesJsonStr) {
        try {
          const catParsed = JSON.parse(categoriesJsonStr);
          if (Array.isArray(catParsed)) parsedCategories = catParsed;
        } catch {
          // ignore
        }
      }

      let parsedTags: string[] | undefined;
      if (tagsJsonStr) {
        try {
          const tagsParsed = JSON.parse(tagsJsonStr);
          if (Array.isArray(tagsParsed)) parsedTags = tagsParsed;
        } catch {
          // ignore
        }
      }

      setParsedBackup({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        totalPrompts: validPosts.length,
        posts: validPosts,
        categories: parsedCategories,
        tags: parsedTags,
        filename: file.name,
        fileType: 'zip',
        fileSize: fileSizeStr,
      });

      showToast(`Extracted ${validPosts.length} prompts from ${file.name}`);
    } catch (err: any) {
      console.error('ZIP extraction error:', err);
      setParseError(`Failed to extract ZIP archive: ${err.message || 'Corrupted or invalid file'}`);
      setParsedBackup(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // 4. Perform the Restore
  const handleExecuteRestore = async () => {
    if (!parsedBackup || parsedBackup.posts.length === 0) return;

    if (restoreMode === 'replace') {
      const confirmReplace = window.confirm(
        `Are you sure you want to REPLACE ALL current prompts with ${parsedBackup.totalPrompts} prompts from this backup? All existing prompts in the database will be replaced.`
      );
      if (!confirmReplace) return;
    }

    setIsRestoring(true);
    setRestoreSuccessCount(null);
    try {
      const result = await restorePromptCards(
        parsedBackup.posts,
        restoreMode,
        parsedBackup.categories,
        parsedBackup.tags
      );
      setRestoreSuccessCount(result.count || parsedBackup.totalPrompts);
      setParsedBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
    } finally {
      setIsRestoring(false);
    }
  };

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Database className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>Prompt Cards Backup & Restore</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Download full ZIP archives or standalone JSON backups of prompt cards, or restore them directly into the database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshData()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors shadow-xs"
            title="Refresh database from cloud"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Cloud DB</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {restoreSuccessCount !== null && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Restore Completed Successfully!
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Database synced with {restoreSuccessCount} prompt cards live on homepage and admin panel.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRestoreSuccessCount(null)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Export Options on Left, Restore on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Download Options (ZIP & JSON) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Download Backups
                </h3>
                <p className="text-xs text-neutral-500">
                  Export prompts, categories, and tags
                </p>
              </div>
            </div>

            {/* Current Database Summary Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 space-y-3">
              <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                <span>Current Live Prompts</span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">{posts.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-neutral-500 block">Published</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{publishedCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-neutral-500 block">Drafts</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{draftCount}</span>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 flex items-start gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Backup contains all prompt texts, image URLs, categories, AI tools, tags, and parameters.
                </span>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="space-y-3">
              {/* ZIP Download (Complete Archive) */}
              <button
                onClick={handleDownloadZipBackup}
                disabled={isExportingZip || posts.length === 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98"
                id="download-zip-backup-btn"
              >
                {isExportingZip ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Compressing ZIP Archive...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    <span>Download Complete Backup Archive (.zip)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Restore From Local ZIP */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Restore Prompts from ZIP Backup
                </h3>
                <p className="text-xs text-neutral-500">
                  Upload a previously downloaded .zip archive to restore prompts
                </p>
              </div>
            </div>

            {/* Drop Zone for ZIP */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400 bg-neutral-50/50 dark:bg-neutral-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    void handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <FileArchive className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  Click to select or drag & drop backup <span className="text-blue-600 font-bold">.ZIP</span> archive
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Accepts <code className="text-blue-500 font-mono">*.zip</code> complete archives
                </p>
              </div>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Backup Preview & Restore Strategy */}
            {parsedBackup && (
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileArchive className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[200px]">
                      {parsedBackup.filename}
                    </span>
                    {parsedBackup.fileSize && (
                      <span className="text-[10px] text-neutral-400 font-mono">({parsedBackup.fileSize})</span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {parsedBackup.totalPrompts} Prompts Found
                  </span>
                </div>

                {/* Restore Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Select Restore Strategy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-3 rounded-xl text-left border text-xs transition-all ${
                        restoreMode === 'merge'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-bold'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Merge / Add to Existing</span>
                      </div>
                      <p className="text-[10px] font-normal text-neutral-500 mt-1">
                        Preserves current prompts and merges imported ones safely.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`p-3 rounded-xl text-left border text-xs transition-all ${
                        restoreMode === 'replace'
                          ? 'border-red-600 bg-red-50/80 dark:bg-red-950/50 text-red-900 dark:text-red-100 font-bold'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Clean & Replace All</span>
                      </div>
                      <p className="text-[10px] font-normal text-neutral-500 mt-1">
                        Replaces all current prompts with the archive contents.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Preview of sample prompts */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Backup Sample Preview
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {parsedBackup.posts.slice(0, 4).map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs"
                      >
                        {p.imageUrl ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 relative bg-neutral-800">
                            <Image
                              src={p.imageUrl}
                              alt={p.title}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 shrink-0 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {p.title}
                          </p>
                          <span className="text-[10px] text-neutral-500">{p.category} • {p.aiTool}</span>
                        </div>
                      </div>
                    ))}
                    {parsedBackup.posts.length > 4 && (
                      <p className="text-[10px] text-neutral-400 italic text-center py-1">
                        + {parsedBackup.posts.length - 4} more prompt cards in backup
                      </p>
                    )}
                  </div>
                </div>

                {/* Execute Restore Button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedBackup(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      restoreMode === 'replace'
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    }`}
                  >
                    {isRestoring ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Restoring to Cloud Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {restoreMode === 'replace'
                            ? `Replace All & Restore ${parsedBackup.totalPrompts} Prompts`
                            : `Merge & Restore ${parsedBackup.totalPrompts} Prompts`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
