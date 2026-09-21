'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Category } from '@/types/prompt';
import { FolderTree, Plus, Trash2, Tag, Layers, Check, Hash, Sparkles, Flame, X, Save, Loader2 } from 'lucide-react';
import { getCategoryIcon } from '@/lib/icons';

export const CategoriesManager = () => {
  const { 
    categories, 
    saveCategory, 
    deleteCategory, 
    tags, 
    addTag, 
    deleteTag, 
    posts, 
    settings,
    saveSettings,
    showToast 
  } = useApp();

  // Category Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Sparkles');
  const [color, setColor] = useState('blue');

  // Tag Form State
  const [newTagName, setNewTagName] = useState('');
  const [newPopularTag, setNewPopularTag] = useState('');
  const [isUpdatingPopular, setIsUpdatingPopular] = useState(false);

  const defaultPopular = [
    'Cinematic 8K', '3D Character', 'Minimalist Logo', 'Anime Style', 'Cyberpunk City', 'Vintage 35mm', 'Hyperrealistic'
  ];

  const [editablePopularTags, setEditablePopularTags] = useState<string[]>(() => {
    return settings.popularTags && settings.popularTags.length > 0
      ? settings.popularTags
      : defaultPopular;
  });

  const handleTogglePopularTag = (tagName: string) => {
    const isPopular = editablePopularTags.some(
      (t) => t.toLowerCase() === tagName.toLowerCase()
    );
    if (isPopular) {
      setEditablePopularTags(editablePopularTags.filter((t) => t.toLowerCase() !== tagName.toLowerCase()));
      showToast(`Removed #${tagName} from draft. Click "Save Changes" to apply.`);
    } else {
      setEditablePopularTags([...editablePopularTags, tagName]);
      showToast(`Added #${tagName} to draft. Click "Save Changes" to apply.`);
    }
  };

  const handleAddCustomPopularTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPopularTag.trim().replace(/^#/, '');
    if (!clean) return;
    if (editablePopularTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      showToast(`Tag #${clean} is already in the list`);
      return;
    }
    setEditablePopularTags([...editablePopularTags, clean]);
    setNewPopularTag('');
    showToast(`Added #${clean} to draft. Click "Save Changes" to apply.`);
  };

  const handleSavePopularTagsChanges = async () => {
    setIsUpdatingPopular(true);
    try {
      await saveSettings({ popularTags: editablePopularTags });
      showToast('Homepage popular tags saved successfully! Changes are now live on the homepage.');
    } catch {
      showToast('Failed to save popular tags to server');
    } finally {
      setIsUpdatingPopular(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Category name is required');
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description,
      iconName: icon,
      color,
      badgeBg: 'bg-blue-500/10 text-blue-500',
    };

    saveCategory(newCategory);
    setName('');
    setSlug('');
    setDescription('');
    showToast(`Added category "${name}"`);
  };

  const handleDeleteCategory = (id: string, catName: string) => {
    if (categories.length <= 1) {
      showToast('Cannot delete the last category.');
      return;
    }
    if (confirm(`Delete category "${catName}"?`)) {
      deleteCategory(id);
      showToast(`Deleted category "${catName}"`);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagName.trim().replace(/^#/, '');
    if (!cleanTag) {
      showToast('Please enter a tag name');
      return;
    }
    addTag(cleanTag);
    setNewTagName('');
  };

  const handleDeleteTag = (tagName: string) => {
    if (confirm(`Delete tag #${tagName}? This will remove it from all associated prompts.`)) {
      deleteTag(tagName);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-10 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
          <FolderTree className="w-6 h-6 text-blue-600" />
          <span>Categories & Taxonomies</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Organize your master prompt catalog into searchable categories and descriptive tags.
        </p>
      </div>

      {/* 1. Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Categories ({categories.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Category Form */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Add New Category</span>
            </h3>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Logo & Branding"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Slug (URL friendly)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="logo-and-branding"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Icon Name
                </label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs"
                >
                  <option value="Sparkles">Sparkles</option>
                  <option value="Camera">Camera</option>
                  <option value="Box">Box / 3D</option>
                  <option value="Code">Code</option>
                  <option value="Brush">Brush / Vector</option>
                  <option value="Layers">Layers</option>
                  <option value="Video">Video / Cinema</option>
                  <option value="TrendingUp">Trending / Marketing</option>
                  <option value="Palette">Palette / Concept</option>
                  <option value="Feather">Feather / Writing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what prompts fit in this category..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors"
              >
                Add New Category
              </button>
            </form>
          </div>

          {/* Categories Table */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                All Categories ({categories.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Slug</th>
                    <th className="pb-3 text-center">Prompts Count</th>
                    <th className="pb-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {categories.map((cat) => {
                    const postCount = posts.filter(
                      (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;
                    return (
                      <tr key={cat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                              {getCategoryIcon(cat.iconName, { className: 'w-3.5 h-3.5' })}
                            </div>
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                                {cat.name}
                              </span>
                              {cat.description && (
                                <span className="text-[11px] text-neutral-400 line-clamp-1">
                                  {cat.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-neutral-500 text-[11px]">
                          /{cat.slug}
                        </td>
                        <td className="py-3 text-center font-bold text-neutral-700 dark:text-neutral-300 font-mono">
                          {postCount}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Homepage Popular Tags Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Homepage Popular Tags ({editablePopularTags.length})
              </h2>
              <p className="text-xs text-neutral-500">
                These tags appear directly under the search bar and in the quick dropdown on the homepage.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <form onSubmit={handleAddCustomPopularTag} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">#</span>
              <input
                type="text"
                value={newPopularTag}
                onChange={(e) => setNewPopularTag(e.target.value)}
                placeholder="Add custom popular tag for homepage (e.g. Cinematic 8K)"
                className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Draft</span>
            </button>
          </form>

          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
              Currently Selected for Homepage (Draft):
            </span>
            <div className="flex flex-wrap gap-2">
              {editablePopularTags.map((tag, idx) => (
                <div
                  key={`${tag}-${idx}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold shadow-xs"
                >
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleTogglePopularTag(tag)}
                    className="p-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-900/60 text-amber-700 dark:text-amber-300 hover:text-red-700 transition-colors ml-0.5"
                    title={`Remove #${tag}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {editablePopularTags.length === 0 && (
                <p className="text-xs text-neutral-400 italic">No popular tags selected.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Click &quot;Save Changes&quot; to push updates live to the homepage.
            </span>
            <button
              type="button"
              disabled={isUpdatingPopular}
              onClick={handleSavePopularTagsChanges}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isUpdatingPopular ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isUpdatingPopular ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tags Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            All Tags Directory ({tags.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Tag Form */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add New Tag</span>
            </h3>

            <form onSubmit={handleAddTag} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Tag Name (without #)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-neutral-400 font-bold text-xs">#</span>
                  <input
                    type="text"
                    required
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Cyberpunk, 35mm, Retro"
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Tags allow users to quickly search and filter specific visual aesthetics.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Tag</span>
              </button>
            </form>
          </div>

          {/* Tags List & Table */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                All Tags Directory ({tags.length})
              </h3>
            </div>

            {tags.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No tags created yet. Add your first tag on the left.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="pb-3">Tag Name</th>
                      <th className="pb-3 text-center">Associated Prompts</th>
                      <th className="pb-3 text-center">Homepage Popular</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {tags.map((tag) => {
                      const tagLower = tag.toLowerCase();
                      const associatedCount = posts.filter(
                        (p) => p.tags && p.tags.some((t) => t.toLowerCase() === tagLower)
                      ).length;
                      const isPopular = editablePopularTags.some((pt) => pt.toLowerCase() === tagLower);

                      return (
                        <tr key={tag} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-3">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 font-semibold text-xs border border-neutral-200 dark:border-neutral-700">
                              <Hash className="w-3 h-3 text-indigo-500" />
                              <span>{tag}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center font-bold text-neutral-700 dark:text-neutral-300 font-mono">
                            {associatedCount}
                          </td>
                          <td className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePopularTag(tag)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                                isPopular
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                              }`}
                            >
                              <Flame className={`w-3 h-3 ${isPopular ? 'text-amber-500' : 'text-neutral-400'}`} />
                              <span>{isPopular ? 'Active on Homepage' : '+ Add to Homepage'}</span>
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteTag(tag)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                              title="Delete Tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
