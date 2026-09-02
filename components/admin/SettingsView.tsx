'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Save, RotateCcw, Download, Upload, Shield, Globe, X, Plus, Database, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';

export const SettingsView = () => {
  const { settings, saveSettings, posts, categories, refreshData, showToast, setAdminSubView } = useApp();

  const [siteName, setSiteName] = useState(settings.siteName || 'Trending Gemini Prompts');
  const [siteTagline, setSiteTagline] = useState(
    settings.siteTagline || 'The Ultimate AI Prompt Directory & Copy-Paste Library'
  );
  const [siteUrl, setSiteUrl] = useState(settings.siteUrl || 'https://trendinggeminiprompts.com');
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail || 'admin@trendinggeminiprompts.com');
  const [footerText, setFooterText] = useState(
    settings.footerText || '© 2026 Trending Gemini Prompts. All prompts are free to copy and modify.'
  );
  const [popularTags, setPopularTags] = useState<string[]>(settings.popularTags || []);
  const [newTag, setNewTag] = useState('');

  // Cloudinary Settings
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(settings.cloudinaryCloudName || '');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState(settings.cloudinaryApiKey || '');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState(settings.cloudinaryApiSecret || '');
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{ configured: boolean; cloudName?: string } | null>(null);

  useEffect(() => {
    fetch('/api/upload')
      .then((res) => res.json())
      .then((data) => {
        setCloudinaryStatus({
          configured: data.configured,
          cloudName: data.cloudName,
        });
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settings,
      siteName,
      siteTagline,
      siteUrl,
      adminEmail,
      footerText,
      popularTags,
      cloudinaryCloudName: cloudinaryCloudName.trim(),
      cloudinaryApiKey: cloudinaryApiKey.trim(),
      cloudinaryApiSecret: cloudinaryApiSecret.trim(),
    };
    saveSettings(updated);
    showToast('Site settings updated successfully!');
    
    // Refresh status check
    fetch('/api/upload')
      .then((res) => res.json())
      .then((data) => {
        setCloudinaryStatus({
          configured: data.configured,
          cloudName: data.cloudName,
        });
      })
      .catch(() => {});
  };

  const handleExportData = () => {
    const backup = {
      posts,
      categories,
      settings,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `geminiprompts-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported full database backup file!');
  };

  const handleResetToDefaults = () => {
    refreshData();
    showToast('Synced all data with server database.');
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
          <span>WordPress General Settings</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configure site identity, domain branding, and database backups.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Site Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Site Title
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Public Domain / URL
              </label>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Administration Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Footer Copyright Text
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Cloudinary CDN Media Storage Settings */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Cloudinary Media CDN Settings</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Automatically host and deliver prompt cover photos via high-speed Cloudinary CDN.
              </p>
            </div>
            <div>
              {cloudinaryStatus?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cloudinary Connected ({cloudinaryStatus.cloudName})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Using Optimized Local Storage</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Cloud Name
              </label>
              <input
                type="text"
                value={cloudinaryCloudName}
                onChange={(e) => setCloudinaryCloudName(e.target.value)}
                placeholder="e.g. dxyz123ab"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={cloudinaryApiKey}
                onChange={(e) => setCloudinaryApiKey(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                API Secret
              </label>
              <input
                type="password"
                value={cloudinaryApiSecret}
                onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Media Settings</span>
            </button>
          </div>
        </div>

        {/* Popular Tags Management */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              Homepage Popular Tags
            </h3>
            <span className="text-[10px] font-bold text-neutral-400 uppercase">Max 12 recommended</span>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add trending tag (e.g. Cinematic 8K)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTag.trim()) {
                      setPopularTags([...popularTags, newTag.trim()]);
                      setNewTag('');
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTag.trim()) {
                    setPopularTags([...popularTags, newTag.trim()]);
                    setNewTag('');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag, index) => (
                <div
                  key={`${tag}-${index}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">{tag}</span>
                  <button
                    type="button"
                    onClick={() => setPopularTags(popularTags.filter((_, i) => i !== index))}
                    className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {popularTags.length === 0 && (
                <p className="text-xs text-neutral-500 italic">No popular tags defined. Add some to show on the homepage.</p>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all transform active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Popular Tags & Settings</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Database Tools & Backup */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Prompt Cards Backup & Restore</span>
        </h3>
        <p className="text-xs text-neutral-500">
          Download clean local JSON backups containing only prompt cards, or restore/replace prompts into your database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setAdminSubView('backup-restore')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all transform active:scale-95"
          >
            <Database className="w-4 h-4" />
            <span>Open Backup & Restore Center</span>
          </button>

          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Download All Data Backup</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>Reset to Factory Seed Prompts</span>
          </button>
        </div>
      </div>
    </div>
  );
};
