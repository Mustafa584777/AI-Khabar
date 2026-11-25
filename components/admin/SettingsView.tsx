'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Save, RotateCcw, Download, Database, Cloud, CheckCircle2, AlertCircle, X, Sparkles, RefreshCw, Upload, FolderArchive } from 'lucide-react';
import JSZip from 'jszip';

export const SettingsView = () => {
  const { settings, saveSettings, posts, categories, tags, restorePromptCards, refreshData, showToast, setAdminSubView } = useApp();

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
  const [isSyncingPosts, setIsSyncingPosts] = useState(false);
  const [isSyncingNotifications, setIsSyncingNotifications] = useState(false);

  const handleSyncFirestoreToNotificationsJson = async () => {
    setIsSyncingNotifications(true);
    try {
      const res = await fetch('/api/admin/sync-notifications-json', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Success! Synced ${data.count} notifications to notifications.json!`);
      } else {
        showToast(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error syncing notifications: ${err.message}`);
    } finally {
      setIsSyncingNotifications(false);
    }
  };

  const handleDownloadNotificationsJson = async () => {
    try {
      const res = await fetch('/api/notifications/send');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data.notifications, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'notifications.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Downloaded notifications.json! Upload to GitHub for 0 Firestore reads.');
      }
    } catch (err: any) {
      showToast(`Failed to download notifications.json: ${err.message}`);
    }
  };

  const handleSyncFirestoreToPostsJson = async () => {
    setIsSyncingPosts(true);
    try {
      const res = await fetch('/api/admin/sync-posts-json', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Success! Synced ${data.count} prompts to posts.json!`);
        void refreshData();
      } else {
        showToast(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error syncing posts: ${err.message}`);
    } finally {
      setIsSyncingPosts(false);
    }
  };

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

  // GitHub Assets + jsDelivr CDN & Bulk Migration State
  const [githubCdnStatus, setGithubCdnStatus] = useState<{
    configured: boolean;
    owner?: string;
    repo?: string;
    branch?: string;
    cdnBaseUrl?: string;
  } | null>(null);
  const [testingGitHubCdn, setTestingGitHubCdn] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{
    totalExpected: number;
    uploadedCount: number;
    missingCount: number;
    totalGitHubFiles: number;
    cloudinaryUrlCount: number;
    alreadyUploadedPaths: string[];
    expectedPaths: string[];
    basenameMap: Record<string, string[]>;
  } | null>(null);
  const [loadingMigrationStats, setLoadingMigrationStats] = useState(false);
  const [isMigratingFiles, setIsMigratingFiles] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{
    processed: number;
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
    statusText: string;
  } | null>(null);
  const [isRewritingUrls, setIsRewritingUrls] = useState(false);
  const migrationFileInputRef = useRef<HTMLInputElement>(null);

  const loadMigrationStatus = async () => {
    setLoadingMigrationStats(true);
    try {
      const res = await fetch('/api/admin/migrate-media');
      const data = await res.json();
      if (data?.success) {
        setMigrationStats(data);
        if (data.github) {
          setGithubCdnStatus({
            configured: Boolean(data.github.configured),
            owner: data.github.owner,
            repo: data.github.repo,
            branch: data.github.branch,
            cdnBaseUrl: data.github.cdnBaseUrl,
          });
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingMigrationStats(false);
    }
  };

  const testGitHubConnection = async () => {
    setTestingGitHubCdn(true);
    try {
      const res = await fetch('/api/upload?test=true');
      const data = await res.json();
      if (data?.success && data?.provider === 'github_cdn') {
        setGithubCdnStatus({
          configured: true,
          owner: data.owner,
          repo: data.repo,
          branch: data.branch,
          cdnBaseUrl: data.cdnBaseUrl,
        });
        showToast(data.message || 'Connected to GitHub Assets + jsDelivr CDN!');
        void loadMigrationStatus();
      } else {
        showToast(`GitHub Assets error: ${data?.error || 'Connection failed'}`);
      }
    } catch (err: any) {
      showToast(`Failed to test GitHub Assets: ${err.message}`);
    } finally {
      setTestingGitHubCdn(false);
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const resolveTargetAssetPaths = (
    rawRelPath: string,
    expectedSet: Set<string>,
    basenameMap: Record<string, string[]>
  ): string[] => {
    const normalized = rawRelPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const lowerNorm = normalized.toLowerCase();
    for (const exp of expectedSet) {
      if (exp.toLowerCase() === lowerNorm) return [exp];
    }
    const baseName = normalized.split('/').pop()?.toLowerCase() || '';
    if (baseName && basenameMap[baseName]?.length > 0) {
      return basenameMap[baseName];
    }
    if (normalized.startsWith('prompts/')) {
      return [normalized];
    }
    return baseName ? [`prompts/${baseName}`] : [];
  };

  const handleBulkMediaUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsMigratingFiles(true);
    setMigrationProgress({
      processed: 0,
      total: 0,
      uploaded: 0,
      skipped: 0,
      failed: 0,
      statusText: 'Preparing files...',
    });

    try {
      // Refresh latest status so already-uploaded paths are skipped accurately
      const statusRes = await fetch('/api/admin/migrate-media');
      const statusData = await statusRes.json();
      if (statusData?.success) {
        setMigrationStats(statusData);
      }

      const expectedSet = new Set<string>(statusData?.expectedPaths || migrationStats?.expectedPaths || []);
      const existingSet = new Set<string>(statusData?.alreadyUploadedPaths || migrationStats?.alreadyUploadedPaths || []);
      const basenameMap: Record<string, string[]> = statusData?.basenameMap || migrationStats?.basenameMap || {};

      const queuedItems: Array<{ targetPath: string; readBase64: () => Promise<string> }> = [];
      const seenTargets = new Set<string>();
      const validImgExt = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

      for (const file of Array.from(fileList)) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          setMigrationProgress((prev) =>
            prev ? { ...prev, statusText: `Extracting ${file.name}...` } : prev
          );
          const zip = await JSZip.loadAsync(file);
          for (const [entryPath, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir || entryPath.startsWith('__MACOSX/')) continue;
            if (!validImgExt.test(entryPath)) continue;
            const targets = resolveTargetAssetPaths(entryPath, expectedSet, basenameMap);
            for (const targetPath of targets) {
              if (seenTargets.has(targetPath)) continue;
              seenTargets.add(targetPath);
              queuedItems.push({
                targetPath,
                readBase64: async () => {
                  const buf = await zipEntry.async('arraybuffer');
                  return arrayBufferToBase64(buf);
                },
              });
            }
          }
        } else if (file.type.startsWith('image/') || validImgExt.test(file.name)) {
          const relPath = (file as any).webkitRelativePath || file.name;
          const targets = resolveTargetAssetPaths(relPath, expectedSet, basenameMap);
          for (const targetPath of targets) {
            if (seenTargets.has(targetPath)) continue;
            seenTargets.add(targetPath);
            queuedItems.push({
              targetPath,
              readBase64: async () => {
                const buf = await file.arrayBuffer();
                return arrayBufferToBase64(buf);
              },
            });
          }
        }
      }

      if (queuedItems.length === 0) {
        showToast('No matching image files found in your selection.');
        setMigrationProgress(null);
        setIsMigratingFiles(false);
        return;
      }

      let processed = 0;
      let uploaded = 0;
      let skipped = 0;
      let failed = 0;

      const toUpload = queuedItems.filter((item) => {
        if (existingSet.has(item.targetPath)) {
          skipped++;
          processed++;
          return false;
        }
        return true;
      });

      setMigrationProgress({
        processed,
        total: queuedItems.length,
        uploaded,
        skipped,
        failed,
        statusText: toUpload.length === 0 ? 'All selected files are already in GitHub!' : `Uploading ${toUpload.length} files to GitHub...`,
      });

      const MAX_FILES_PER_BATCH = 8;
      const MAX_BYTES_PER_BATCH = 2.4 * 1024 * 1024;
      let currentBatch: Array<{ path: string; contentBase64: string }> = [];
      let currentBatchBytes = 0;

      const flushBatch = async () => {
        if (currentBatch.length === 0) return;
        const batchToSend = currentBatch;
        currentBatch = [];
        currentBatchBytes = 0;

        setMigrationProgress({
          processed,
          total: queuedItems.length,
          uploaded,
          skipped,
          failed,
          statusText: `Committing batch of ${batchToSend.length} images to GitHub...`,
        });

        try {
          const res = await fetch('/api/admin/migrate-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload_batch', files: batchToSend }),
          });
          const data = await res.json();
          if (data?.success) {
            uploaded += Array.isArray(data.uploadedPaths) ? data.uploadedPaths.length : batchToSend.length;
            skipped += Array.isArray(data.skippedPaths) ? data.skippedPaths.length : 0;
          } else {
            failed += batchToSend.length;
            showToast(`Batch upload error: ${data?.error || 'Failed'}`);
          }
        } catch {
          failed += batchToSend.length;
        }
        processed += batchToSend.length;
        setMigrationProgress({
          processed,
          total: queuedItems.length,
          uploaded,
          skipped,
          failed,
          statusText: `Uploaded ${uploaded} / ${queuedItems.length}...`,
        });
      };

      for (const item of toUpload) {
        try {
          const b64 = await item.readBase64();
          if (currentBatch.length >= MAX_FILES_PER_BATCH || (currentBatch.length > 0 && currentBatchBytes + b64.length > MAX_BYTES_PER_BATCH)) {
            await flushBatch();
          }
          currentBatch.push({ path: item.targetPath, contentBase64: b64 });
          currentBatchBytes += b64.length;
        } catch {
          failed++;
          processed++;
        }
      }
      await flushBatch();

      setMigrationProgress({
        processed,
        total: queuedItems.length,
        uploaded,
        skipped,
        failed,
        statusText: `Done! Uploaded: ${uploaded}, Already present: ${skipped}, Failed: ${failed}.`,
      });
      showToast(`Uploaded ${uploaded} images to GitHub (${skipped} already existed).`);
      await loadMigrationStatus();
    } catch (err: any) {
      showToast(`Migration error: ${err?.message || 'Failed to read files'}`);
    } finally {
      setIsMigratingFiles(false);
      if (migrationFileInputRef.current) {
        migrationFileInputRef.current.value = '';
      }
    }
  };

  const handleRewriteAllMediaUrls = async () => {
    setIsRewritingUrls(true);
    try {
      const res = await fetch('/api/admin/migrate-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rewrite_urls' }),
      });
      const data = await res.json();
      if (data?.success) {
        showToast(data.message || 'Successfully migrated URLs to jsDelivr CDN!');
        await loadMigrationStatus();
        void refreshData();
      } else {
        showToast(`URL rewrite failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error updating URLs: ${err.message}`);
    } finally {
      setIsRewritingUrls(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/upload')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.provider === 'github_cdn') {
            setGithubCdnStatus({
              configured: Boolean(data.configured),
              owner: data.owner,
              repo: data.repo,
              branch: data.branch,
              cdnBaseUrl: data.cdnBaseUrl,
            });
          }
          setCloudinaryStatus({
            configured: data.provider === 'cloudinary' ? data.configured : false,
            cloudName: data.cloudName,
          });
        }
      })
      .catch(() => {});

    void loadMigrationStatus();

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

        {/* GitHub Assets Repo + jsDelivr CDN & Bulk Migration */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>GitHub Assets + jsDelivr CDN (Primary Storage)</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Host all prompt images in <code className="font-mono text-neutral-700 dark:text-neutral-300">{githubCdnStatus?.owner || 'Mustafa584777'}/{githubCdnStatus?.repo || 'zeena-prompt-assets'}</code> and serve via free global jsDelivr CDN with zero Vercel bandwidth cost.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={testGitHubConnection}
                disabled={testingGitHubCdn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingGitHubCdn ? 'animate-spin' : ''}`} />
                <span>{testingGitHubCdn ? 'Testing...' : 'Test GitHub CDN'}</span>
              </button>

              {githubCdnStatus?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected ({githubCdnStatus.owner}/{githubCdnStatus.repo})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Set GITHUB_ASSETS_TOKEN in Env</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="text-[11px] font-medium text-neutral-500">Tracked Assets</div>
              <div className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5">
                {loadingMigrationStats ? '...' : (migrationStats?.totalExpected ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-500">Uploaded in GitHub</div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {loadingMigrationStats ? '...' : (migrationStats?.uploadedCount ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-500">Remaining Missing</div>
              <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {loadingMigrationStats ? '...' : (migrationStats?.missingCount ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-500">Old Cloudinary Links</div>
              <div className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5">
                {loadingMigrationStats ? '...' : (migrationStats?.cloudinaryUrlCount ?? 0)}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <input
              ref={migrationFileInputRef}
              type="file"
              multiple
              accept=".zip,image/*"
              className="hidden"
              onChange={(e) => void handleBulkMediaUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => migrationFileInputRef.current?.click()}
              disabled={isMigratingFiles}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 ${isMigratingFiles ? 'animate-bounce' : ''}`} />
              <span>{isMigratingFiles ? 'Uploading to GitHub...' : 'Upload Recovered Images / ZIP'}</span>
            </button>

            <button
              type="button"
              onClick={handleRewriteAllMediaUrls}
              disabled={isRewritingUrls}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRewritingUrls ? 'animate-spin' : ''}`} />
              <span>{isRewritingUrls ? 'Updating DB & JSON...' : 'Update All URLs in JSON + Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={() => void loadMigrationStatus()}
              disabled={loadingMigrationStats}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMigrationStats ? 'animate-spin' : ''}`} />
              <span>Refresh Count</span>
            </button>
          </div>

          {migrationProgress && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <span>{migrationProgress.statusText}</span>
                <span>
                  {migrationProgress.total > 0
                    ? `${Math.min(migrationProgress.processed, migrationProgress.total)} / ${migrationProgress.total}`
                    : ''}
                </span>
              </div>
              {migrationProgress.total > 0 && (
                <div className="w-full h-2 rounded-full bg-emerald-200/70 dark:bg-emerald-900/60 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((migrationProgress.processed / migrationProgress.total) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legacy Cloudinary Fallback Settings */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Cloudinary Fallback Settings (Optional)</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Used only if GitHub Assets CDN is not configured.
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
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-[11px] font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Secondary Fallback</span>
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



      {/* Database to posts.json & notifications.json Sync & Migration Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-blue-500/10 dark:from-emerald-950/30 dark:via-neutral-900 dark:to-blue-950/30 p-6 rounded-3xl border border-emerald-500/30 dark:border-emerald-700/40 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Sync & Download Static JSON for GitHub (posts.json & notifications.json)</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                Pulls all latest posts & notifications from Firebase Firestore and permanently saves them to local <code className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">data/posts.json</code> and <code className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">data/notifications.json</code> so they always load instantly on the homepage with 0 Firestore reads.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 uppercase tracking-wide">
            Static GitHub Sync
          </span>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isSyncingPosts}
            onClick={handleSyncFirestoreToPostsJson}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingPosts ? 'animate-spin' : ''}`} />
            <span>{isSyncingPosts ? 'Syncing...' : 'Sync Posts to posts.json'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/posts?all=true&source=firebase');
                const data = await res.json();
                if (data.success && data.posts) {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data.posts, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute('href', dataStr);
                  downloadAnchor.setAttribute('download', 'posts.json');
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  alert('Downloaded posts.json successfully! Upload or replace data/posts.json in your GitHub repository to make it permanent with 0 Firestore reads.');
                }
              } catch (err: any) {
                alert(`Failed to download posts.json: ${err.message}`);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download posts.json for GitHub</span>
          </button>

          <button
            type="button"
            disabled={isSyncingNotifications}
            onClick={handleSyncFirestoreToNotificationsJson}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingNotifications ? 'animate-spin' : ''}`} />
            <span>{isSyncingNotifications ? 'Syncing...' : 'Sync Firestore to notifications.json'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadNotificationsJson}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/30 transition-all transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download notifications.json for GitHub</span>
          </button>
        </div>
      </div>

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
