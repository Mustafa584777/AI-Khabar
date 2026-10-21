'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  FileSpreadsheet,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Layers,
  Bell,
  Search,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Check,
} from 'lucide-react';

export const GoogleSheetsSyncManager = () => {
  const { posts, showToast } = useApp();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ id: string; url: string } | null>(null);
  const [migrationStats, setMigrationStats] = useState<{ prompts: number; notifications: number; searches: number } | null>(null);

  const handleGoogleConnectAndMigrate = async () => {
    setIsMigrating(true);
    setProgressText('Authenticating with Google Workspace (Sheets & Drive)...');

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error('Failed to obtain Google Sheets authorization token.');
      }

      setConnectedEmail(result.user.email);
      setProgressText('Creating Master Google Spreadsheet in your Google Drive...');

      // 1. Create Google Spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: `PromptCMS Master Database (${new Date().toISOString().slice(0, 10)})`,
          },
          sheets: [
            { properties: { title: 'Prompts' } },
            { properties: { title: 'Notifications' } },
            { properties: { title: 'SearchHistory' } },
          ],
        }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json();
        throw new Error(errJson.error?.message || 'Failed to create Google Spreadsheet');
      }

      const sheetData = await createRes.json();
      const spreadsheetId = sheetData.spreadsheetId;
      const spreadsheetUrl = sheetData.spreadsheetUrl;

      setSheetInfo({ id: spreadsheetId, url: spreadsheetUrl });
      setProgressText(`Spreadsheet created! Migrating ${posts.length} prompts to Google Sheets...`);

      // 2. Fetch Notifications and Search History
      let notifications: any[] = [];
      try {
        const nRes = await fetch('/api/notifications', { cache: 'no-store' });
        if (nRes.ok) {
          const nJson = await nRes.json();
          if (Array.isArray(nJson.notifications)) notifications = nJson.notifications;
        }
      } catch {}

      let searchQueries: any[] = [];
      try {
        const sRes = await fetch('/api/search-queries?all=true', { cache: 'no-store' });
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (Array.isArray(sJson.queries)) searchQueries = sJson.queries;
        }
      } catch {}

      // 3. Write Prompts to "Prompts" tab
      const promptRows = [
        ['ID', 'Title', 'Category', 'AI Tool', 'Prompt Text', 'Image URL', 'Tags', 'Status', 'CreatedAt'],
        ...posts.map((p) => [
          p.id,
          p.title,
          p.category,
          p.aiTool,
          p.promptText,
          p.imageUrl,
          (p.tags || []).join(', '),
          p.status,
          p.createdAt,
        ]),
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Prompts!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: 'Prompts!A1',
            majorDimension: 'ROWS',
            values: promptRows,
          }),
        }
      );

      // 4. Write Notifications to "Notifications" tab
      if (notifications.length > 0) {
        const notifRows = [
          ['ID', 'Title', 'Message', 'Type', 'CreatedAt'],
          ...notifications.map((n) => [n.id || '', n.title || '', n.message || '', n.type || '', n.createdAt || '']),
        ];
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Notifications!A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: 'Notifications!A1',
              majorDimension: 'ROWS',
              values: notifRows,
            }),
          }
        );
      }

      // 5. Write Search History to "SearchHistory" tab
      if (searchQueries.length > 0) {
        const searchRows = [
          ['Query', 'Count', 'LastSearched'],
          ...searchQueries.map((s) => [s.query || '', s.count || 1, s.lastSearched || '']),
        ];
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/SearchHistory!A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: 'SearchHistory!A1',
              majorDimension: 'ROWS',
              values: searchRows,
            }),
          }
        );
      }

      setMigrationStats({
        prompts: posts.length,
        notifications: notifications.length,
        searches: searchQueries.length,
      });

      showToast('Successfully migrated all data to Google Sheets!');
    } catch (err: any) {
      console.error('Google Sheets migration error:', err);
      showToast(err.message || 'Google Sheets migration failed');
    } finally {
      setIsMigrating(false);
      setProgressText('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-neutral-900 text-white p-8 rounded-3xl shadow-2xl border border-emerald-800/60 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold shadow-inner">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <span>Google Sheets Database Sync & Migration</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider font-bold">
                Zero Firestore Reads
              </span>
            </h2>
            <p className="text-xs text-emerald-200/80 mt-1 max-w-xl">
              Migrate and store all Prompt Cards, Notification Cards, and Search History directly into your Google Sheets. User authentication and accounts remain secure on Firebase.
            </p>
          </div>
        </div>

        {/* Live Data Summary to Migrate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-emerald-800/60">
          <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-100">Prompt Cards</span>
            </div>
            <span className="text-base font-black text-white">{posts.length}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-emerald-100">Notifications</span>
            </div>
            <span className="text-base font-black text-white">Ready</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-emerald-100">Search History</span>
            </div>
            <span className="text-base font-black text-white">Ready</span>
          </div>
        </div>
      </div>

      {/* Migration Action Card */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-6 text-center">
        {sheetInfo ? (
          <div className="space-y-5 animate-fade-in py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Google Sheets Migration Successful!
              </h3>
              <p className="text-xs text-neutral-500">
                Connected as <strong className="text-neutral-700 dark:text-neutral-300">{connectedEmail}</strong>
              </p>
            </div>

            {migrationStats && (
              <div className="flex justify-center gap-4 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                <span className="px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {migrationStats.prompts} Prompts Migrated
                </span>
                <span className="px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {migrationStats.notifications} Notifications
                </span>
                <span className="px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {migrationStats.searches} Search Queries
                </span>
              </div>
            )}

            <div className="pt-2">
              <a
                href={sheetInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all transform active:scale-98"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Your Google Spreadsheet</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                One-Click Connect & Migrate to Google Sheets
              </h3>
              <p className="text-xs text-neutral-500">
                Click below to authorize with Google. A brand new master spreadsheet containing all your prompts, notifications, and search history will be automatically created in your Google Drive.
              </p>
            </div>

            <button
              onClick={handleGoogleConnectAndMigrate}
              disabled={isMigrating}
              className="py-3.5 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-600/30 inline-flex items-center gap-2.5 transition-all transform active:scale-98"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressText}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Connect Google & Migrate Now</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure OAuth 2.0 • Direct Google Drive Integration • Zero Firestore Reads</span>
        </div>
      </div>
    </div>
  );
};
