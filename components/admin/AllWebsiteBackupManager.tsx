'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  FileJson,
  Layers,
  Sparkles,
  Users,
  Search,
  Bell,
  MessageSquare,
  ShieldCheck,
  Check,
  Info,
  Clock,
  ArrowRight,
  HardDrive,
  CheckCircle,
} from 'lucide-react';
import JSZip from 'jszip';

interface LiveSummaryStats {
  prompts: number;
  users: number;
  categories: number;
  tags: number;
  searchQueries: number;
  notifications: number;
  subscribers: number;
  promptRequests: number;
}

interface ParsedBackupAllData {
  filename: string;
  fileSize: string;
  fileType: 'json' | 'zip';
  exportedAt?: string;
  version?: string;
  counts: {
    prompts: number;
    users: number;
    categories: number;
    tags: number;
    searchQueries: number;
    notifications: number;
    subscribers: number;
    promptRequests: number;
    hasSettings: boolean;
  };
  payload: any;
}

interface RestoreSummaryResult {
  restoredPrompts: number;
  restoredUsers: number;
  restoredCategories: number;
  restoredTags: number;
  restoredSearchQueries: number;
  restoredNotifications: number;
  restoredSubscribers: number;
  restoredRequests: number;
  settingsRestored: boolean;
}

export const AllWebsiteBackupManager = () => {
  const { posts, categories, tags, refreshData, showToast } = useApp();

  const [liveStats, setLiveStats] = useState<LiveSummaryStats>({
    prompts: posts.length,
    users: 0,
    categories: categories.length,
    tags: tags.length,
    searchQueries: 0,
    notifications: 0,
    subscribers: 0,
    promptRequests: 0,
  });

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressText, setRestoreProgressText] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  const [parsedBackup, setParsedBackup] = useState<ParsedBackupAllData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreSummaryResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live counts across all 8 collections
  const fetchLiveCounts = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      // 1. Users count
      let usersCount = 0;
      try {
        const uRes = await fetch('/api/admin/users', { cache: 'no-store' });
        if (uRes.ok) {
          const uJson = await uRes.json();
          if (Array.isArray(uJson.users)) usersCount = uJson.users.length;
        }
      } catch {
        // ignore
      }

      // 2. Search queries count
      let searchCount = 0;
      try {
        const sRes = await fetch('/api/search-queries?all=true', { cache: 'no-store' });
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (Array.isArray(sJson.queries)) searchCount = sJson.queries.length;
        }
      } catch {
        // ignore
      }

      // 3. Notifications & Subscribers count
      let notifsCount = 0;
      let subsCount = 0;
      try {
        const nRes = await fetch('/api/notifications', { cache: 'no-store' });
        if (nRes.ok) {
          const nJson = await nRes.json();
          if (Array.isArray(nJson.notifications)) notifsCount = nJson.notifications.length;
          if (typeof nJson.subscribersCount === 'number') subsCount = nJson.subscribersCount;
        }
      } catch {
        // ignore
      }

      // 4. Prompt requests count
      let reqCount = 0;
      try {
        const rRes = await fetch('/api/prompt-requests', { cache: 'no-store' });
        if (rRes.ok) {
          const rJson = await rRes.json();
          if (Array.isArray(rJson.requests)) reqCount = rJson.requests.length;
        }
      } catch {
        // ignore
      }

      setLiveStats({
        prompts: posts.length,
        users: usersCount,
        categories: categories.length,
        tags: tags.length,
        searchQueries: searchCount,
        notifications: notifsCount,
        subscribers: subsCount,
        promptRequests: reqCount,
      });
    } catch (err) {
      console.warn('Error fetching live stats for all backup view:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [posts.length, categories.length, tags.length]);

  useEffect(() => {
    void fetchLiveCounts();
  }, [fetchLiveCounts]);

  // 1. One-Click Complete Website JSON Download
  const handleDownloadAllJson = async () => {
    try {
      setIsExportingJson(true);
      const res = await fetch('/api/admin/backup-all', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate all website backup');
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `promptcms-all-website-data-backup-${dateStr}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      showToast(
        `All Website Data Backup downloaded! (${data.summary?.totalPrompts || 0} prompts, ${data.summary?.totalUsers || 0} users)`
      );
    } catch (err: any) {
      console.error('All JSON export error:', err);
      showToast(err.message || 'Failed to download complete website backup');
    } finally {
      setIsExportingJson(false);
    }
  };

  // 2. One-Click Complete Website Master ZIP Archive Download
  const handleDownloadAllZip = async () => {
    try {
      setIsExportingZip(true);
      const res = await fetch('/api/admin/backup-all', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate all website backup');
      }

      const zip = new JSZip();
      const dateStr = new Date().toISOString().slice(0, 10);

      // 1. Master Comprehensive JSON
      zip.file('all_website_data.json', JSON.stringify(data, null, 2));

      // 2. Individual domain JSONs for convenience
      zip.file('prompts.json', JSON.stringify(data.posts || [], null, 2));
      zip.file('users.json', JSON.stringify(data.users || [], null, 2));
      zip.file('categories.json', JSON.stringify(data.categories || [], null, 2));
      zip.file('tags.json', JSON.stringify(data.tags || [], null, 2));
      zip.file('search_queries.json', JSON.stringify(data.searchQueries || [], null, 2));
      zip.file('push_notifications.json', JSON.stringify(data.pushNotifications || {}, null, 2));
      zip.file('prompt_requests.json', JSON.stringify(data.promptRequests || [], null, 2));
      zip.file('settings.json', JSON.stringify(data.settings || {}, null, 2));

      // 3. Prompts Text Folder
      const textFolder = zip.folder('prompts_text');
      if (textFolder && Array.isArray(data.posts)) {
        data.posts.forEach((post: any, i: number) => {
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

      // 4. Manifest & Readme
      const manifest = {
        name: 'PromptCMS Master Complete Archive',
        site: 'tool.reelz',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        summary: data.summary,
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      zip.file(
        'README.txt',
        `PromptCMS Master Complete Website Archive
Exported: ${new Date().toLocaleString()}

SUMMARY:
- Prompts: ${data.summary?.totalPrompts || 0}
- Registered Users: ${data.summary?.totalUsers || 0}
- Categories: ${data.summary?.totalCategories || 0}
- Tags: ${data.summary?.totalTags || 0}
- Search Queries: ${data.summary?.totalSearchQueries || 0}
- Push Notifications: ${data.summary?.totalPushNotifications || 0}
- Push Subscribers: ${data.summary?.totalPushSubscribers || 0}
- Requested Prompts: ${data.summary?.totalRequestedPrompts || 0}

INCLUDED FILES:
- all_website_data.json: Master single-file bundle containing all data
- prompts.json: Prompt cards database
- users.json: Registered users and accounts
- categories.json: Categories list
- tags.json: Tags list
- search_queries.json: User search logs
- push_notifications.json: Notifications & subscribers
- prompt_requests.json: Custom requested prompts
- settings.json: Site settings & branding
- prompts_text/: Plain text files for each prompt

TO RESTORE:
Go to Admin Panel -> Backup & Restore -> All Website Data -> Upload this .zip archive or all_website_data.json, and click "Restore All Website Data Now".`
      );

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `promptcms-master-complete-backup-${dateStr}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      showToast(`Master ZIP Archive downloaded! (${data.summary?.totalPrompts || 0} prompts, ${data.summary?.totalUsers || 0} users)`);
    } catch (err: any) {
      console.error('All ZIP export error:', err);
      showToast(err.message || 'Failed to download master ZIP archive');
    } finally {
      setIsExportingZip(false);
    }
  };

  // 3. Process Uploaded File (JSON or ZIP)
  const handleFileSelect = async (file: File) => {
    setParseError(null);
    setRestoreResult(null);

    const isZip = file.name.endsWith('.zip') || file.type.includes('zip') || file.type.includes('octet-stream');
    const isJson = file.name.endsWith('.json') || file.type.includes('json');

    if (!isZip && !isJson) {
      setParseError('Please upload a valid .json or .zip backup archive.');
      return;
    }

    const fileSizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

    try {
      let finalPayload: any = null;

      if (isJson) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        finalPayload = parsed.data || parsed;
      } else {
        // ZIP Archive Handling
        const zip = new JSZip();
        const zipData = await zip.loadAsync(file);

        // Check for all_website_data.json first
        const allDataFile = Object.keys(zipData.files).find((f) =>
          f.toLowerCase().endsWith('all_website_data.json')
        );

        if (allDataFile) {
          const str = await zipData.files[allDataFile].async('string');
          const parsed = JSON.parse(str);
          finalPayload = parsed.data || parsed;
        } else {
          // Reconstruct from individual JSON files in ZIP
          const assembled: any = {};
          const candidateFiles = Object.keys(zipData.files).filter((k) => !zipData.files[k].dir);

          for (const filename of candidateFiles) {
            const lower = filename.toLowerCase();
            if (lower.endsWith('prompts.json') || lower.endsWith('backup.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.posts = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('users.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.users = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('categories.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.categories = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('tags.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.tags = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('search_queries.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.searchQueries = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('push_notifications.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.pushNotifications = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('prompt_requests.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.promptRequests = JSON.parse(str);
              } catch {
                // ignore
              }
            } else if (lower.endsWith('settings.json')) {
              try {
                const str = await zipData.files[filename].async('string');
                assembled.settings = JSON.parse(str);
              } catch {
                // ignore
              }
            }
          }
          finalPayload = assembled;
        }
      }

      if (!finalPayload || typeof finalPayload !== 'object') {
        throw new Error('File does not contain valid JSON backup data.');
      }

      // Analyze detected counts
      const postsCount = Array.isArray(finalPayload.posts)
        ? finalPayload.posts.length
        : Array.isArray(finalPayload.prompts)
        ? finalPayload.prompts.length
        : 0;

      const usersCount = Array.isArray(finalPayload.users)
        ? finalPayload.users.length
        : Array.isArray(finalPayload.registeredUsers)
        ? finalPayload.registeredUsers.length
        : 0;

      const categoriesCount = Array.isArray(finalPayload.categories) ? finalPayload.categories.length : 0;
      const tagsCount = Array.isArray(finalPayload.tags) ? finalPayload.tags.length : 0;
      const searchCount = Array.isArray(finalPayload.searchQueries)
        ? finalPayload.searchQueries.length
        : Array.isArray(finalPayload.queries)
        ? finalPayload.queries.length
        : 0;

      const pushNotifsCount = Array.isArray(finalPayload.pushNotifications?.notifications)
        ? finalPayload.pushNotifications.notifications.length
        : Array.isArray(finalPayload.notifications)
        ? finalPayload.notifications.length
        : 0;

      const pushSubsCount = Array.isArray(finalPayload.pushNotifications?.subscribers)
        ? finalPayload.pushNotifications.subscribers.length
        : Array.isArray(finalPayload.subscribers)
        ? finalPayload.subscribers.length
        : 0;

      const requestsCount = Array.isArray(finalPayload.promptRequests)
        ? finalPayload.promptRequests.length
        : Array.isArray(finalPayload.requests)
        ? finalPayload.requests.length
        : 0;

      const hasSettings = Boolean(finalPayload.settings && typeof finalPayload.settings === 'object');

      const totalItems =
        postsCount +
        usersCount +
        categoriesCount +
        tagsCount +
        searchCount +
        pushNotifsCount +
        pushSubsCount +
        requestsCount;

      if (totalItems === 0 && !hasSettings) {
        throw new Error('No recognized website data found in the uploaded backup file.');
      }

      setParsedBackup({
        filename: file.name,
        fileSize: fileSizeStr,
        fileType: isZip ? 'zip' : 'json',
        exportedAt: finalPayload.exportedAt,
        version: finalPayload.version || '2.0',
        counts: {
          prompts: postsCount,
          users: usersCount,
          categories: categoriesCount,
          tags: tagsCount,
          searchQueries: searchCount,
          notifications: pushNotifsCount,
          subscribers: pushSubsCount,
          promptRequests: requestsCount,
          hasSettings,
        },
        payload: finalPayload,
      });

      showToast(`Analyzed ${file.name}: ${postsCount} prompts, ${usersCount} users, ${categoriesCount} categories detected!`);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError(err.message || 'Failed to read backup file.');
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

  // 4. One-Click Restore Execution
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;

    if (restoreMode === 'replace') {
      const confirmMsg = window.confirm(
        `Are you sure you want to REPLACE ALL website data?\n\nThis will overwrite current prompt cards, users, and tags with the backup file data.`
      );
      if (!confirmMsg) return;
    }

    setIsRestoring(true);
    setRestoreProgressText('Preparing database restore...');
    setRestoreResult(null);

    try {
      setRestoreProgressText('Syncing prompts, registered users, and categories into database...');
      const res = await fetch('/api/admin/backup-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: restoreMode,
          data: parsedBackup.payload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to restore all website data');
      }

      setRestoreProgressText('Database sync completed! Updating live state...');
      setRestoreResult(json.summary);
      setParsedBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh app data and counters
      refreshData();
      void fetchLiveCounts();

      showToast(json.message || 'All website data restored successfully!');
    } catch (err: any) {
      console.error('Restore error:', err);
      setParseError(err.message || 'Failed to execute database restore');
      showToast(err.message || 'Restore error occurred');
    } finally {
      setIsRestoring(false);
      setRestoreProgressText('');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Live Database Overview Bar */}
      <div className="p-5 rounded-3xl bg-neutral-900 dark:bg-black text-white border border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Complete Website Live Database</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                  Live Synced
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Real-time snapshot of all 8 core entities ready for 1-click export or instant database restoration.
              </p>
            </div>
          </div>

          <button
            onClick={() => void fetchLiveCounts()}
            disabled={isLoadingStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors disabled:opacity-50 self-start sm:self-center"
            title="Refresh database counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
            <span>{isLoadingStats ? 'Refreshing...' : 'Refresh Stats'}</span>
          </button>
        </div>

        {/* 8-Card Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2 border-t border-neutral-800">
          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Prompts</span>
              <Layers className="w-3 h-3 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white">{liveStats.prompts}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Users</span>
              <Users className="w-3 h-3 text-purple-400" />
            </div>
            <div className="text-lg font-black text-purple-300">{liveStats.users}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Categories</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-lg font-black text-white">{liveStats.categories}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Tags</span>
              <span className="text-[10px] font-mono text-cyan-400">#</span>
            </div>
            <div className="text-lg font-black text-white">{liveStats.tags}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Searches</span>
              <Search className="w-3 h-3 text-pink-400" />
            </div>
            <div className="text-lg font-black text-white">{liveStats.searchQueries}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Notifs</span>
              <Bell className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white">{liveStats.notifications}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Subscribers</span>
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="text-lg font-black text-white">{liveStats.subscribers}</div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-semibold mb-1">
              <span>Requests</span>
              <MessageSquare className="w-3 h-3 text-orange-400" />
            </div>
            <div className="text-lg font-black text-orange-300">{liveStats.promptRequests}</div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner after Restore */}
      {restoreResult && (
        <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                  All Website Data Restored Successfully!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Database and client state have been synchronized with the backup archive.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRestoreResult(null)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline px-2"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Prompts Restored</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                {restoreResult.restoredPrompts}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Users Restored</span>
              <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">
                {restoreResult.restoredUsers}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Categories</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200 text-sm">
                {restoreResult.restoredCategories}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Tags</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200 text-sm">
                {restoreResult.restoredTags}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Search Queries</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200 text-sm">
                {restoreResult.restoredSearchQueries}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Notifications</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200 text-sm">
                {restoreResult.restoredNotifications}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-neutral-500 block text-[10px]">Requested Prompts</span>
              <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                {restoreResult.restoredRequests}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Backup Export (Left) & One-Click Restore (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 1-Click All Website Backup Export */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  1-Click Complete Backup
                </h3>
                <p className="text-xs text-neutral-500">
                  Export 100% of website data in one comprehensive archive
                </p>
              </div>
            </div>

            {/* Checklist of what's included */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 space-y-2.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Everything Backed Up in 1 File:</span>
              </div>
              <ul className="space-y-1.5 pl-5 list-disc text-[11px] leading-relaxed">
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Prompt Cards:</strong> All titles, full prompt texts, negative prompts, image URLs, parameters, and tags.
                </li>
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Registered Users:</strong> All user profiles, active subscription tiers, credits, points, search quota, and unlock history.
                </li>
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Search History:</strong> All recorded user search queries and counts.
                </li>
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Categories & Tags:</strong> Complete taxonomy structure and slug routes.
                </li>
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Push Notifications:</strong> Sent notification messages, subscriber list, and stats.
                </li>
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Requested Prompts:</strong> Custom user requests, fulfillment statuses, and delivered prompt texts.
                </li>
                <li>
                  <strong className="text-neutral-800 dark:text-neutral-200">Site Settings:</strong> Site name, meta descriptions, and configuration.
                </li>
              </ul>
            </div>

            {/* Download Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadAllJson}
                disabled={isExportingJson || isExportingZip}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98"
                id="download-all-website-json-btn"
              >
                {isExportingJson ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Compiling Master JSON Backup...</span>
                  </>
                ) : (
                  <>
                    <FileJson className="w-4 h-4" />
                    <span>Download All Website Data (.json)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={isExportingJson || isExportingZip}
                className="w-full py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-neutral-300/70 dark:border-neutral-700"
                id="download-all-website-zip-btn"
              >
                {isExportingZip ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                    <span>Compressing Master ZIP Archive...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4 text-amber-500" />
                    <span>Download Master Backup Archive (.zip)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 1-Click All Website Restore */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  1-Click Complete Restore
                </h3>
                <p className="text-xs text-neutral-500">
                  Upload master backup (.json or .zip) to restore all database entities in one click
                </p>
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-101'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400 bg-neutral-50/50 dark:bg-neutral-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.zip,application/json,application/zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    void handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Drag & Drop backup file here, or click to browse
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Supports master <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">.json</span> or{' '}
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">.zip</span> archives
                </p>
              </div>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parsed Inspection Preview Card */}
            {parsedBackup && (
              <div className="p-5 rounded-3xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                        {parsedBackup.filename}
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        Size: {parsedBackup.fileSize} &bull; Type: {parsedBackup.fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setParsedBackup(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-white font-semibold underline"
                  >
                    Clear
                  </button>
                </div>

                {/* Detected Breakdown Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Prompts</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{parsedBackup.counts.prompts}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Users</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{parsedBackup.counts.users}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Categories</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">{parsedBackup.counts.categories}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Tags</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">{parsedBackup.counts.tags}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Search Queries</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">{parsedBackup.counts.searchQueries}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Notifications</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">{parsedBackup.counts.notifications}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Subscribers</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">{parsedBackup.counts.subscribers}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Prompt Requests</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{parsedBackup.counts.promptRequests}</span>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                    Restore Strategy:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        restoreMode === 'merge'
                          ? 'border-blue-500 bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="font-bold text-xs">Merge (Safe)</div>
                      <div className="text-[10px] text-neutral-500">Adds missing records & updates existing</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        restoreMode === 'replace'
                          ? 'border-amber-500 bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="font-bold text-xs">Replace (Clean)</div>
                      <div className="text-[10px] text-neutral-500">Overwrites database with backup records</div>
                    </button>
                  </div>
                </div>

                {/* Execute Button */}
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98"
                  id="restore-all-website-btn"
                >
                  {isRestoring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{restoreProgressText || 'Restoring Database...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Restore All Website Data Now</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
