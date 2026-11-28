'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost } from '@/types/prompt';
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  UploadCloud,
  Loader2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { getPromptSlug, getImageFallbackCandidates } from '@/lib/utils';
import { compactPostsForJson } from '@/lib/post-normalizer';

const AdminPostThumb = ({ src, alt, slug }: { src: string; alt: string; slug: string }) => {
  const [fallbackIdx, setFallbackIdx] = useState<number>(-1);
  const candidates = useMemo(() => getImageFallbackCandidates(src, slug), [src, slug]);
  const activeSrc = fallbackIdx >= 0 && fallbackIdx < candidates.length ? candidates[fallbackIdx] : src;

  return (
    <img
      src={activeSrc}
      alt={alt}
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => {
        setFallbackIdx((prev) => {
          const next = prev + 1;
          return next < candidates.length ? next : prev;
        });
      }}
    />
  );
};

export const PostsManager = () => {
  const {
    posts,
    setPosts,
    categories,
    moveToTrash,
    restoreFromTrash,
    permanentlyDeletePosts,
    hasPendingGitHubPush,
    markGitHubPushSynced,
    togglePublishStatus,
    togglePremiumStatus,
    toggleNoIndexStatus,
    setAdminSubView,
    setEditingPostId,
    setCurrentView,
    setSelectedPost,
    showToast,
    refreshData,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'trash'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPushingGitHub, setIsPushingGitHub] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const activePosts = useMemo(() => posts.filter((p) => p.status !== 'trash'), [posts]);
  const publishedCount = useMemo(
    () => activePosts.filter((p) => p.status === 'published').length,
    [activePosts]
  );
  const draftCount = useMemo(
    () => activePosts.filter((p) => p.status === 'draft').length,
    [activePosts]
  );
  const trashPosts = useMemo(() => posts.filter((p) => p.status === 'trash'), [posts]);
  const trashCount = trashPosts.length;

  const handleDownloadPostsJson = async () => {
    try {
      let rawList = posts;
      try {
        const res = await fetch('/api/posts?all=true&source=firebase', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
            rawList = data.posts;
          }
        }
      } catch (e) {
        console.warn('Error fetching from firebase for download:', e);
      }

      // Strict client-side deduplication safeguard before generating posts.json download
      const seenIds = new Set<string>();
      const seenSlugs = new Set<string>();
      const cleanPostsToDownload: PromptPost[] = [];

      for (const p of rawList) {
        if (!p || !p.id) continue;
        const slug = getPromptSlug(p);
        if (!seenIds.has(p.id) && !seenSlugs.has(slug)) {
          seenIds.add(p.id);
          seenSlugs.add(slug);
          cleanPostsToDownload.push({
            ...p,
            slug,
          });
        }
      }

      const blob = new Blob(
        [JSON.stringify(compactPostsForJson(cleanPostsToDownload), null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'posts.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Downloaded latest posts.json with ${cleanPostsToDownload.length} prompts (0 duplicates)!`);
    } catch (e) {
      console.error('Error downloading posts.json:', e);
      showToast('Failed to download posts.json');
    }
  };

  const handlePushPostsToGitHub = async () => {
    if (isPushingGitHub) return;
    setIsPushingGitHub(true);
    try {
      const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const postUpdates = posts.map((p) => {
        const updatedTs = new Date(p.updatedAt || p.createdAt || 0).getTime();
        const isDirtyOrTrash = p.status === 'trash' || updatedTs >= recentCutoff;
        if (isDirtyOrTrash) {
          return {
            ...p,
            slug: getPromptSlug(p),
          };
        }
        return {
          id: p.id,
          slug: getPromptSlug(p),
          title: p.title,
          imageUrl: p.imageUrl,
          imageAlt: p.imageAlt,
          imageFileName: p.imageFileName,
          additionalImages: p.additionalImages,
          status: p.status,
          isPremium: p.isPremium,
          isNoIndex: p.isNoIndex,
          updatedAt: p.updatedAt,
        };
      });

      let deletedIds: string[] = [];
      if (typeof window !== 'undefined') {
        try {
          const rawDel = localStorage.getItem('promptcms_deleted_ids');
          if (rawDel) {
            const parsed = JSON.parse(rawDel);
            if (Array.isArray(parsed)) deletedIds = parsed.filter(Boolean);
          }
        } catch {}
      }

      const res = await fetch('/api/admin/push-posts-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUpdates, deletedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to push posts.json to GitHub');
      }
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setPosts(data.posts);
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('promptcms_deleted_ids');
        } catch {}
      }
      markGitHubPushSynced();
      refreshData();
      showToast(data.message || `Pushed posts.json to ${data.repo}!`);
    } catch (e: any) {
      showToast(e?.message || 'Failed to push posts.json to GitHub');
    } finally {
      setIsPushingGitHub(false);
    }
  };

  const handleStatusTabChange = (nextStatus: 'all' | 'published' | 'draft' | 'trash') => {
    setStatusFilter(nextStatus);
    setSelectedIds([]);
    setConfirmEmptyTrash(false);
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (statusFilter === 'trash') {
        if (post.status !== 'trash') return false;
      } else {
        // Never display trashed prompts inside All / Published / Drafts
        if (post.status === 'trash') return false;
        if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      }
      if (categoryFilter !== 'all' && post.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          post.title.toLowerCase().includes(q) ||
          post.promptText.toLowerCase().includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [posts, statusFilter, categoryFilter, search]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPosts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkPublish = () => {
    selectedIds.forEach((id) => {
      const p = posts.find((item) => item.id === id);
      if (p && p.status !== 'published') {
        togglePublishStatus(id);
      }
    });
    setSelectedIds([]);
    showToast('Selected posts published live!');
  };

  const handleBulkDraft = () => {
    selectedIds.forEach((id) => {
      const p = posts.find((item) => item.id === id);
      if (p && p.status !== 'draft') {
        togglePublishStatus(id);
      }
    });
    setSelectedIds([]);
    showToast('Selected posts reverted to draft');
  };

  const handleBulkTrash = async () => {
    if (selectedIds.length === 0) return;
    await moveToTrash(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    await restoreFromTrash(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    await permanentlyDeletePosts(selectedIds);
    setSelectedIds([]);
  };

  const handleEmptyTrash = async () => {
    if (trashPosts.length === 0) return;
    if (!confirmEmptyTrash) {
      setConfirmEmptyTrash(true);
      return;
    }
    const allTrashIds = trashPosts.map((p) => p.id);
    await permanentlyDeletePosts(allTrashIds);
    setSelectedIds([]);
    setConfirmEmptyTrash(false);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>Prompt Articles & Posts</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
              {activePosts.length}
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your prompt catalog, edit articles, and push posts.json to GitHub only when ready.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePushPostsToGitHub}
            disabled={isPushingGitHub}
            className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-60 ${
              hasPendingGitHubPush
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900'
            }`}
            id="btn-push-posts-github"
            title="Push latest posts.json directly to GitHub (Mustafa584777/AI-Khabar)"
          >
            {isPushingGitHub ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>
              {isPushingGitHub
                ? 'Pushing...'
                : hasPendingGitHubPush
                  ? 'Push posts.json to GitHub (Pending)'
                  : 'Push posts.json to GitHub'}
            </span>
          </button>

          <button
            onClick={handleDownloadPostsJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors cursor-pointer"
            id="btn-download-posts-json"
          >
            <Download className="w-4 h-4" />
            <span>Download posts.json</span>
          </button>

          <button
            onClick={() => {
              setEditingPostId(null);
              setAdminSubView('new-post');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
            id="btn-add-new-post-top"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Prompt</span>
          </button>
        </div>
      </div>

      {/* Editorial Status Tabs */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => handleStatusTabChange('all')}
          className={`hover:text-blue-600 transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          All ({activePosts.length})
        </button>
        <span className="text-neutral-300 dark:text-neutral-700">|</span>
        <button
          onClick={() => handleStatusTabChange('published')}
          className={`hover:text-emerald-600 transition-colors cursor-pointer ${
            statusFilter === 'published'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          Published ({publishedCount})
        </button>
        <span className="text-neutral-300 dark:text-neutral-700">|</span>
        <button
          onClick={() => handleStatusTabChange('draft')}
          className={`hover:text-amber-600 transition-colors cursor-pointer ${
            statusFilter === 'draft'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          Drafts ({draftCount})
        </button>
        <span className="text-neutral-300 dark:text-neutral-700">|</span>
        <button
          onClick={() => handleStatusTabChange('trash')}
          id="tab-posts-trash"
          className={`inline-flex items-center gap-1.5 hover:text-red-600 transition-colors cursor-pointer ${
            statusFilter === 'trash'
              ? 'text-red-600 dark:text-red-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Trash ({trashCount})</span>
        </button>
      </div>

      {/* Trash Notice Banner */}
      {statusFilter === 'trash' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl">
          <div className="flex items-start gap-2.5 text-xs text-red-800 dark:text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Trash Section ({trashCount} removed {trashCount === 1 ? 'prompt' : 'prompts'})</p>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80 mt-0.5">
                Removed prompts appear here and are hidden from your live site. Restore them anytime or permanently delete them, then click &quot;Push posts.json to GitHub&quot;.
              </p>
            </div>
          </div>

          {trashCount > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {confirmEmptyTrash ? (
                <>
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Confirm Empty Trash ({trashCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEmptyTrash(false)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Trash</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            statusFilter === 'trash' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {selectedIds.length} Selected:
                </span>
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkPermanentDelete}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-semibold hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Forever</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {selectedIds.length} Selected:
                </span>
                <button
                  type="button"
                  onClick={handleBulkPublish}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={handleBulkDraft}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 text-xs font-semibold hover:bg-amber-100 cursor-pointer"
                >
                  Set to Draft
                </button>
                <button
                  type="button"
                  onClick={handleBulkTrash}
                  className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 text-xs font-semibold hover:bg-red-100 cursor-pointer"
                >
                  Move to Trash
                </button>
              </div>
            )
          ) : (
            <div className="text-xs text-neutral-400 font-medium">
              Select rows below for bulk actions
            </div>
          )}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="text-xs py-2 pl-8 pr-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950/80 text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredPosts.length > 0 && selectedIds.length === filteredPosts.length
                    }
                    className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-4 pr-3">Prompt Title & Slug</th>
                <th className="py-4 px-3">Category</th>
                <th className="py-4 px-3">Status</th>
                <th className="py-4 px-3">{statusFilter === 'trash' ? 'Removed' : 'Date'}</th>
                <th className="py-4 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => {
                  const isChecked = selectedIds.includes(post.id);
                  const isTrashed = post.status === 'trash';

                  return (
                    <tr
                      key={post.id}
                      className={`group hover:bg-blue-50/40 dark:hover:bg-neutral-800/50 transition-colors ${
                        isChecked ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(post.id)}
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      <td className="py-4 pr-3 max-w-sm">
                        <div className="flex items-center gap-3">
                          {post.imageUrl && (
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200 dark:border-neutral-800">
                              <AdminPostThumb
                                src={post.imageUrl}
                                alt={post.title}
                                slug={getPromptSlug(post)}
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4
                                onClick={() => {
                                  if (!isTrashed) {
                                    setEditingPostId(post.id);
                                    setAdminSubView('edit-post');
                                  }
                                }}
                                className={`font-bold text-neutral-900 dark:text-white text-xs line-clamp-1 ${
                                  isTrashed ? '' : 'hover:text-blue-600 cursor-pointer'
                                }`}
                              >
                                {post.title}
                              </h4>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isTrashed) togglePremiumStatus(post.id);
                                }}
                                title={post.isPremium ? 'Currently PRO Premium (Click to change to Free)' : 'Currently Free (Click to upgrade to PRO Premium)'}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 transition-all cursor-pointer ${
                                  post.isPremium
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                    : 'bg-neutral-100 hover:bg-amber-100 dark:bg-neutral-800 dark:hover:bg-amber-950/60 text-neutral-400 hover:text-amber-600'
                                }`}
                              >
                                <Crown className={`w-2.5 h-2.5 ${post.isPremium ? 'fill-white' : ''}`} />
                                <span>{post.isPremium ? 'PRO' : 'FREE'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isTrashed) toggleNoIndexStatus(post.id);
                                }}
                                title={post.isNoIndex ? 'Currently NoIndex (Excluded from sitemap). Click to make Indexable' : 'Currently Indexable. Click to set NoIndex'}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 transition-all cursor-pointer ${
                                  post.isNoIndex
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                                }`}
                              >
                                <span>{post.isNoIndex ? 'NOINDEX' : 'INDEX'}</span>
                              </button>
                            </div>
                            <p className="text-[11px] text-neutral-400 font-mono truncate">
                              /{post.slug}
                            </p>

                            {/* Row Action Links */}
                            <div className="flex items-center gap-2 pt-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[11px]">
                              {isTrashed ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void restoreFromTrash([post.id]);
                                    }}
                                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                                  >
                                    Restore
                                  </button>
                                  <span className="text-neutral-300">|</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void permanentlyDeletePosts([post.id]);
                                    }}
                                    className="text-red-600 dark:text-red-400 font-medium hover:underline cursor-pointer"
                                  >
                                    Delete Forever
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPostId(post.id);
                                      setAdminSubView('edit-post');
                                    }}
                                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-neutral-300">|</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPost(post);
                                      setCurrentView('public');
                                    }}
                                    className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
                                  >
                                    View Live
                                  </button>
                                  <span className="text-neutral-300">|</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void moveToTrash([post.id]);
                                    }}
                                    className="text-red-600 dark:text-red-400 font-medium hover:underline cursor-pointer"
                                  >
                                    Trash
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3 text-neutral-600 dark:text-neutral-300 font-medium text-[11px]">
                        {post.category}
                      </td>

                      <td className="py-4 px-3">
                        {isTrashed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800">
                            <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                            <span>In Trash</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => togglePublishStatus(post.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                              post.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {post.status === 'published' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Published</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Draft</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-3 text-neutral-400 font-mono text-[11px]">
                        {new Date(
                          isTrashed
                            ? post.deletedAt || post.updatedAt || post.createdAt
                            : post.createdAt
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTrashed ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void restoreFromTrash([post.id]);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 cursor-pointer"
                                title="Restore Prompt"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void permanentlyDeletePosts([post.id]);
                                }}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                                title="Delete Forever"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPostId(post.id);
                                  setAdminSubView('edit-post');
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void moveToTrash([post.id]);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    {statusFilter === 'trash'
                      ? 'Trash is empty. Removed prompts will appear here.'
                      : 'No prompts found matching your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
