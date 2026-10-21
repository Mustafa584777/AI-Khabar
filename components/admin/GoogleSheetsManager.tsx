'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { GoogleSheetsConfig } from '@/types/prompt';
import {
  signInWithGoogleSheets,
  getGoogleAccessToken,
  setGoogleAccessToken,
} from '@/lib/google-auth';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Upload,
  Download,
  PlusCircle,
  Database,
  Sparkles,
  ShieldCheck,
  Check,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const GoogleSheetsManager: React.FC = () => {
  const { posts, showToast } = useApp();

  const [config, setConfig] = useState<GoogleSheetsConfig>({
    spreadsheetId: '',
    spreadsheetUrl: '',
    enabled: false,
    autoSync: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [inputSpreadsheet, setInputSpreadsheet] = useState('');
  const [isAuthenticatedWithGoogle, setIsAuthenticatedWithGoogle] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/google-sheets');
      if (res.ok) {
        const json = await res.json();
        if (json.config) {
          setConfig(json.config);
          setInputSpreadsheet(json.config.spreadsheetId || '');
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Google Sheets config:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfig();
    setIsAuthenticatedWithGoogle(Boolean(getGoogleAccessToken()));
  }, []);

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      const res = await signInWithGoogleSheets();
      if (res?.accessToken) {
        setIsAuthenticatedWithGoogle(true);
        showToast('Google account authorized for Google Sheets!');
      }
    } catch (e: any) {
      showToast(e.message || 'Google authorization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (enabledState?: boolean) => {
    try {
      setIsLoading(true);
      const token = getGoogleAccessToken();
      const res = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'save-config',
          spreadsheetId: inputSpreadsheet,
          enabled: enabledState !== undefined ? enabledState : config.enabled,
          autoSync: config.autoSync,
        }),
      });

      const json = await res.json();
      if (json.success && json.config) {
        setConfig(json.config);
        showToast(json.message || 'Google Sheets configuration saved!');
      } else {
        throw new Error(json.error || 'Failed to save configuration');
      }
    } catch (e: any) {
      showToast(e.message || 'Error saving configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSheet = async () => {
    let token = getGoogleAccessToken();
    if (!token) {
      try {
        const authRes = await signInWithGoogleSheets();
        token = authRes?.accessToken || null;
        if (token) setIsAuthenticatedWithGoogle(true);
      } catch (e: any) {
        showToast(e.message || 'Google authorization failed');
        return;
      }
    }

    if (!token) {
      showToast('Please sign in with Google to create a spreadsheet.');
      return;
    }

    setIsCreating(true);
    setLastActionMessage(null);
    try {
      const res = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create-sheet',
          accessToken: token,
          title: 'AI-Khabar CMS Database',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setConfig(json.config);
        setInputSpreadsheet(json.config.spreadsheetId || '');
        setLastActionMessage(json.message);
        showToast('Google Sheet created and populated successfully!');
      } else {
        throw new Error(json.error || 'Failed to create spreadsheet');
      }
    } catch (e: any) {
      showToast(e.message || 'Error creating spreadsheet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleMigrateAll = async () => {
    let token = getGoogleAccessToken();
    if (!token && !config.spreadsheetId && !inputSpreadsheet) {
      showToast('Please connect a Google Sheet first.');
      return;
    }

    if (!token) {
      try {
        const authRes = await signInWithGoogleSheets();
        token = authRes?.accessToken || null;
        if (token) setIsAuthenticatedWithGoogle(true);
      } catch (e: any) {
        showToast(e.message || 'Google authorization failed');
        return;
      }
    }

    setIsMigrating(true);
    setLastActionMessage(null);
    try {
      const res = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'migrate-all',
          spreadsheetId: inputSpreadsheet || config.spreadsheetId,
          accessToken: token,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setLastActionMessage(json.message);
        showToast(json.message);
        void fetchConfig();
      } else {
        throw new Error(json.error || 'Failed to migrate to Google Sheet');
      }
    } catch (e: any) {
      showToast(e.message || 'Error migrating data');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleImportAll = async () => {
    const token = getGoogleAccessToken();
    const sheetId = inputSpreadsheet || config.spreadsheetId;
    if (!sheetId) {
      showToast('Please enter or connect a Google Spreadsheet ID first.');
      return;
    }

    setIsImporting(true);
    setLastActionMessage(null);
    try {
      const res = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'import-all',
          spreadsheetId: sheetId,
          accessToken: token,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setLastActionMessage(json.message);
        showToast(json.message);
        void fetchConfig();
      } else {
        throw new Error(json.error || 'Failed to import from Google Sheet');
      }
    } catch (e: any) {
      showToast(e.message || 'Error importing data');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Google Sheets Database & CMS</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your AI Prompts, Notification Cards, and Search History directly inside Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticatedWithGoogle ? (
            <button
              onClick={handleGoogleAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-bold transition-all shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Authorize Google Account</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Google Account Connected</span>
            </span>
          )}

          <button
            onClick={fetchConfig}
            className="p-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Backup & Restore Safety Assurance Notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>Backup & Restore Protection Guaranteed</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase tracking-wider">
              Automatic Sync
            </span>
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Whenever you restore missed-out prompts or master backup archives in <strong>Backup & Restore</strong>, they are automatically saved to your connected Google Sheet in addition to your database. No prompt cards or notification records will be lost during migration or recovery.
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Status Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Connection Status</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                config.enabled && config.spreadsheetId
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}
            >
              {config.enabled && config.spreadsheetId ? 'Active & Linked' : 'Not Connected'}
            </span>
          </div>

          <div>
            <div className="text-xl font-black text-neutral-900 dark:text-white">
              {config.spreadsheetId ? 'Google Sheet Linked' : 'No Spreadsheet Set'}
            </div>
            {config.spreadsheetUrl ? (
              <a
                href={config.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Open Google Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-xs text-neutral-400 mt-1">Connect or create one below to start syncing.</p>
            )}
          </div>
        </div>

        {/* Prompts Tab Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Prompts in Feed</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Sheet: Prompts</span>
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 dark:text-white">
              {posts.length} Prompts
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Synced with title, category, AI tool, image, and parameters.
            </p>
          </div>
        </div>

        {/* Sync Mode */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Last Synced</span>
            <span className="text-xs text-neutral-400">
              {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-neutral-900 dark:text-white">
              {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleDateString() : 'Not Yet Synced'}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              All 3 tabs: Prompts, Notifications, and SearchHistory.
            </p>
          </div>
        </div>
      </div>

      {lastActionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lastActionMessage}</span>
        </div>
      )}

      {/* Action Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A: One-Click Auto-Create */}
        <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Auto-Create Google Sheet
              </h3>
              <p className="text-xs text-neutral-500">
                Creates a new spreadsheet with Prompts, Notifications & SearchHistory tabs.
              </p>
            </div>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            One-click creation initializes all 3 tabs with standard headers and automatically exports all current prompts and notification cards into your Google Drive.
          </p>

          <button
            onClick={handleCreateNewSheet}
            disabled={isCreating}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
          >
            {isCreating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating Spreadsheet & Syncing...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Create & Populate New Google Sheet</span>
              </>
            )}
          </button>
        </div>

        {/* Option B: Connect Existing Spreadsheet */}
        <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Connect Existing Google Sheet
              </h3>
              <p className="text-xs text-neutral-500">
                Paste your existing Google Spreadsheet URL or Sheet ID.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Google Spreadsheet ID or URL:
            </label>
            <input
              type="text"
              value={inputSpreadsheet}
              onChange={(e) => setInputSpreadsheet(e.target.value)}
              placeholder="e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-xs text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveConfig(true)}
              disabled={isLoading || !inputSpreadsheet}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Link Spreadsheet</span>
            </button>

            {config.enabled && (
              <button
                onClick={() => handleSaveConfig(false)}
                disabled={isLoading}
                className="py-2.5 px-3 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors"
                title="Disconnect"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Sync & Migration Controls */}
      <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-6">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Bi-Directional Synchronization</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Push changes to Google Sheets or pull new prompt rows directly into your application.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Export / Push to Google Sheet</span>
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                Uploads all {posts.length} local prompts, notifications, and search history into the linked Google Sheet.
              </p>
            </div>
            <button
              onClick={handleMigrateAll}
              disabled={isMigrating || (!config.spreadsheetId && !inputSpreadsheet)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Pushing to Google Sheet...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Push All Prompts to Google Sheet</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Import / Pull from Google Sheet</span>
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                Reads prompts added or edited directly in the Google Sheet and syncs them into the app.
              </p>
            </div>
            <button
              onClick={handleImportAll}
              disabled={isImporting || (!config.spreadsheetId && !inputSpreadsheet)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Pulling from Google Sheet...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pull & Update Prompts from Google Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Structure Guide */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 space-y-2">
          <p className="font-semibold text-neutral-700 dark:text-neutral-300">
            Google Sheet Tab Layout:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">1. Prompts:</span> ID, Title, Slug, Category, AI Tool, Prompt Text, Negative Prompt, Image URL, Tags, Status, Is Premium, Views, Copies, Likes, Parameters, Created At.
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">
              <span className="font-bold text-blue-600 dark:text-blue-400">2. Notifications:</span> ID, Title, Subtitle, Body, Category, Image URL, Link URL, Sent At.
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">
              <span className="font-bold text-amber-600 dark:text-amber-400">3. SearchHistory:</span> ID, Query, Count, Results Count, Category, Last Searched, Created At.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
