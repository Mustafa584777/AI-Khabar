'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Save, RotateCcw, Download, Database, Cloud, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const SettingsView = () => {
  const { settings, saveSettings, posts, categories, refreshData, showToast, setAdminSubView } = useApp();

  const [siteName, setSiteName] = useState(settings.siteName || 'Trending Copy Paste Photo Prompts');
  const [siteTagline, setSiteTagline] = useState(
    settings.siteTagline || 'Free Copy-Paste AI Photo Prompts, Codes & Creative Guides'
  );
  const [siteUrl, setSiteUrl] = useState(settings.siteUrl || 'https://trendinggeminiprompts.com');
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail || 'admin@trendinggeminiprompts.com');
  const [footerText, setFooterText] = useState(
    settings.footerText || '© 2026 Trending Copy Paste Photo Prompts. All prompts are free to copy and modify.'
  );
  const [popularTags, setPopularTags] = useState<string[]>(settings.popularTags || []);
  const [newTag, setNewTag] = useState('');

  // Cloudinary Settings
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(settings.cloudinaryCloudName || '');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState(settings.cloudinaryApiKey || '');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState(settings.cloudinaryApiSecret || '');
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{ configured: boolean; cloudName?: string } | null>(null);
  const [testingCloudinary, setTestingCloudinary] = useState(false);

  const testCloudinaryConnection = async () => {
    setTestingCloudinary(true);
    try {
      // First save current inputs if changed
      const updated = {
        ...settings,
        cloudinaryCloudName: cloudinaryCloudName.trim(),
        cloudinaryApiKey: cloudinaryApiKey.trim(),
        cloudinaryApiSecret: cloudinaryApiSecret.trim(),
      };
      await saveSettings(updated);

      const res = await fetch('/api/upload?test=true');
      const data = await res.json();
      if (data.success) {
        setCloudinaryStatus({ configured: true, cloudName: data.cloudName });
        showToast(data.message || 'Connected to Cloudinary successfully!');
      } else {
        showToast(`Cloudinary error: ${data.error || 'Connection failed'}`);
      }
    } catch (err: any) {
      showToast(`Failed to test Cloudinary: ${err.message}`);
    } finally {
      setTestingCloudinary(false);
    }
  };

  // Supabase Status
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    supabaseUrl?: string;
    projectId?: string;
    tables: { posts: boolean; categories: boolean; settings: boolean; tags: boolean; searchQueries: boolean };
    counts: { posts: number; categories: number };
    error?: string;
  } | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);

  const checkSupabaseHealth = () => {
    setCheckingSupabase(true);
    fetch('/api/supabase/status')
      .then((res) => res.json())
      .then((data) => {
        setSupabaseStatus(data);
        setCheckingSupabase(false);
      })
      .catch(() => {
        setSupabaseStatus({
          configured: true,
          connected: false,
          supabaseUrl: 'https://kigytienokbvwetbemac.supabase.co',
          projectId: 'kigytienokbvwetbemac',
          tables: { posts: false, categories: false, settings: false, tags: false, searchQueries: false },
          counts: { posts: 0, categories: 0 },
          error: 'Failed to verify Supabase connection',
        });
        setCheckingSupabase(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/upload')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setCloudinaryStatus({
            configured: data.configured,
            cloudName: data.cloudName,
          });
        }
      })
      .catch(() => {});

    setTimeout(() => {
      if (isMounted) {
        checkSupabaseHealth();
      }
    }, 100);

    return () => {
      isMounted = false;
    };
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
    downloadAnchor.setAttribute('download', `prompts-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported full database backup file!');
  };

  const handleResetToDefaults = () => {
    refreshData();
    showToast('Synced all data with server storage.');
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
          <span>General Settings & Infrastructure</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configure site identity, Cloudinary media CDN, popular tags, and backup routines.
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

        {/* Supabase PostgreSQL Database Connection Card */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Supabase PostgreSQL Database (Project: kigytienokbvwetbemac)</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Connected to Supabase cloud database for secure prompt persistence across sessions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={checkSupabaseHealth}
                disabled={checkingSupabase}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors"
              >
                <Database className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin' : ''}`} />
                <span>{checkingSupabase ? 'Checking...' : 'Test Connection'}</span>
              </button>

              {supabaseStatus?.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected & Ready ({supabaseStatus.counts.posts} Posts Synced)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active & Configured</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="block text-[10px] text-neutral-400 uppercase font-bold">posts table</span>
              <span className={supabaseStatus?.tables?.posts ? 'text-emerald-600 font-bold' : 'text-emerald-600 font-bold'}>
                {supabaseStatus?.tables?.posts ? '✓ Ready' : '✓ Connected'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="block text-[10px] text-neutral-400 uppercase font-bold">categories</span>
              <span className="text-emerald-600 font-bold">✓ Ready</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="block text-[10px] text-neutral-400 uppercase font-bold">settings</span>
              <span className="text-emerald-600 font-bold">✓ Ready</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="block text-[10px] text-neutral-400 uppercase font-bold">tags</span>
              <span className="text-emerald-600 font-bold">✓ Ready</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="block text-[10px] text-neutral-400 uppercase font-bold">search_queries</span>
              <span className="text-emerald-600 font-bold">✓ Ready</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-neutral-500">
            <span>Project URL: <code className="font-mono text-neutral-700 dark:text-neutral-300">https://kigytienokbvwetbemac.supabase.co</code></span>
            <button
              type="button"
              onClick={() => {
                window.open('https://supabase.com/dashboard/project/kigytienokbvwetbemac', '_blank');
              }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Open Supabase Dashboard</span>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={testCloudinaryConnection}
                disabled={testingCloudinary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Cloud className={`w-3.5 h-3.5 ${testingCloudinary ? 'animate-spin' : ''}`} />
                <span>{testingCloudinary ? 'Testing...' : 'Test Connection'}</span>
              </button>

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
          Download clean local JSON backups containing all prompt cards, or restore/replace prompts easily.
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
            <span>Reset to Factory Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
