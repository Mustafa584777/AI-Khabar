'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost } from '@/types/prompt';
import {
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Globe,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

export const PostsManager = () => {
  const {
    posts,
    categories,
    deletePost,
    togglePublishStatus,
    setAdminSubView,
    setEditingPostId,
    setCurrentView,
    setSelectedPost,
    showToast,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
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

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} prompts?`)) {
      selectedIds.forEach((id) => deletePost(id));
      setSelectedIds([]);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>Prompt Articles & Posts</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
              {posts.length}
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your prompt catalog, edit articles, and control publication status.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPostId(null);
            setAdminSubView('new-post');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors"
          id="btn-add-new-post-top"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Prompt</span>
        </button>
      </div>

      {/* WordPress Status Tabs */}
      <div className="flex items-center gap-3 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`hover:text-blue-600 transition-colors ${
            statusFilter === 'all'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          All ({posts.length})
        </button>
        <span className="text-neutral-300 dark:text-neutral-700">|</span>
        <button
          onClick={() => setStatusFilter('published')}
          className={`hover:text-emerald-600 transition-colors ${
            statusFilter === 'published'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          Published ({publishedCount})
        </button>
        <span className="text-neutral-300 dark:text-neutral-700">|</span>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`hover:text-amber-600 transition-colors ${
            statusFilter === 'draft'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-neutral-500'
          }`}
        >
          Drafts ({draftCount})
        </button>
      </div>

      {/* Action Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {selectedIds.length} Selected:
              </span>
              <button
                onClick={handleBulkPublish}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"
              >
                Publish
              </button>
              <button
                onClick={handleBulkDraft}
                className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 text-xs font-semibold hover:bg-amber-100"
              >
                Set to Draft
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 text-xs font-semibold hover:bg-red-100"
              >
                Delete
              </button>
            </div>
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
                <th className="py-4 px-3 text-center">Copies / Views</th>
                <th className="py-4 px-3">Status</th>
                <th className="py-4 px-3">Date</th>
                <th className="py-4 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => {
                  const isChecked = selectedIds.includes(post.id);

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
                              <Image
                                src={post.imageUrl}
                                alt={post.title}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4
                              onClick={() => {
                                setEditingPostId(post.id);
                                setAdminSubView('edit-post');
                              }}
                              className="font-bold text-neutral-900 dark:text-white text-xs hover:text-blue-600 cursor-pointer line-clamp-1"
                            >
                              {post.title}
                            </h4>
                            <p className="text-[11px] text-neutral-400 font-mono truncate">
                              /{post.slug}
                            </p>

                            {/* Row Action Links */}
                            <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                              <button
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setAdminSubView('edit-post');
                                }}
                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                Edit
                              </button>
                              <span className="text-neutral-300">|</span>
                              <button
                                onClick={() => {
                                  setSelectedPost(post);
                                  setCurrentView('public');
                                }}
                                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                              >
                                View Live
                              </button>
                              <span className="text-neutral-300">|</span>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete prompt "${post.title}"?`)) {
                                    deletePost(post.id);
                                  }
                                }}
                                className="text-red-600 dark:text-red-400 font-medium hover:underline"
                              >
                                Trash
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3 text-neutral-600 dark:text-neutral-300 font-medium text-[11px]">
                        {post.category}
                      </td>

                      <td className="py-4 px-3 text-center">
                        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          {post.copiesCount || 0}
                        </span>
                        <span className="text-neutral-400 text-[10px] block">
                          {post.viewsCount || 0} views
                        </span>
                      </td>

                      <td className="py-4 px-3">
                        <button
                          onClick={() => togglePublishStatus(post.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
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
                      </td>

                      <td className="py-4 px-3 text-neutral-400 font-mono text-[11px]">
                        {new Date(post.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingPostId(post.id);
                              setAdminSubView('edit-post');
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete prompt "${post.title}"?`)) {
                                deletePost(post.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No prompts found matching your criteria.
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
