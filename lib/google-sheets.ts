import { PromptPost, SearchQueryItem, GoogleSheetsConfig } from '@/types/prompt';
import { PushNotificationItem } from '@/types/notification';
import fs from 'fs';
import path from 'path';
import { db as firestoreDb, isFirebaseConfigured } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DATA_DIR = path.join(process.cwd(), 'data');
const SHEETS_CONFIG_FILE = path.join(DATA_DIR, 'google_sheets.json');

const PROMPTS_TAB = 'Prompts';
const NOTIFICATIONS_TAB = 'Notifications';
const SEARCH_HISTORY_TAB = 'SearchHistory';

const PROMPTS_HEADERS = [
  'ID',
  'Title',
  'Slug',
  'Category',
  'AI Tool',
  'Prompt Text',
  'Negative Prompt',
  'Image URL',
  'Tags',
  'Status',
  'Is Premium',
  'Views',
  'Copies',
  'Likes',
  'Parameters',
  'Created At',
  'Updated At',
];

const NOTIFICATIONS_HEADERS = [
  'ID',
  'Title',
  'Subtitle',
  'Body',
  'Category',
  'Image URL',
  'Link URL',
  'Sent At',
];

const SEARCH_HEADERS = [
  'ID',
  'Query',
  'Count',
  'Results Count',
  'Category',
  'Last Searched',
  'Created At',
];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's a URL like https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export const GoogleSheetsService = {
  getConfig: (): GoogleSheetsConfig => {
    try {
      ensureDataDir();
      if (fs.existsSync(SHEETS_CONFIG_FILE)) {
        const raw = fs.readFileSync(SHEETS_CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.spreadsheetId) {
          return {
            ...parsed,
            enabled: true,
            spreadsheetUrl: parsed.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/edit`,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading google_sheets.json:', e);
    }

    const envId = process.env.GOOGLE_SPREADSHEET_ID || '';
    return {
      spreadsheetId: envId,
      spreadsheetUrl: envId ? `https://docs.google.com/spreadsheets/d/${envId}/edit` : '',
      enabled: Boolean(envId),
      autoSync: false,
      lastSyncedAt: undefined,
    };
  },

  getConfigAsync: async (): Promise<GoogleSheetsConfig> => {
    if (isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'settings', 'google_sheets_config'));
        if (snap.exists() && snap.data()?.config) {
          const remoteCfg = snap.data().config as GoogleSheetsConfig;
          if (remoteCfg && remoteCfg.spreadsheetId) {
            ensureDataDir();
            const normalized = {
              ...remoteCfg,
              enabled: true,
              spreadsheetUrl: remoteCfg.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${remoteCfg.spreadsheetId}/edit`,
            };
            fs.writeFileSync(SHEETS_CONFIG_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
            return normalized;
          }
        }
      } catch (e) {
        console.warn('Firestore getConfigAsync fallback:', e);
      }
    }
    return GoogleSheetsService.getConfig();
  },

  saveConfig: (config: GoogleSheetsConfig): GoogleSheetsConfig => {
    ensureDataDir();
    const cleanId = extractSpreadsheetId(config.spreadsheetId || '');
    const updated: GoogleSheetsConfig = {
      ...config,
      spreadsheetId: cleanId,
      spreadsheetUrl: cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '',
      enabled: Boolean(cleanId),
    };
    try {
      fs.writeFileSync(SHEETS_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving google_sheets.json:', e);
    }

    if (isFirebaseConfigured()) {
      setDoc(
        doc(firestoreDb, 'settings', 'google_sheets_config'),
        {
          config: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((e) => console.error('Firestore saveConfig error:', e));
    }

    return updated;
  },

  // 1. Create a brand new Spreadsheet with all 3 tabs initialized
  createSpreadsheet: async (
    accessToken: string,
    title = 'AI-Khabar CMS Database'
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
    if (!accessToken) {
      throw new Error('Google authorization token required to create a spreadsheet.');
    }

    const payload = {
      properties: {
        title,
      },
      sheets: [
        { properties: { title: PROMPTS_TAB } },
        { properties: { title: NOTIFICATIONS_TAB } },
        { properties: { title: SEARCH_HISTORY_TAB } },
      ],
    };

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create Google Sheet: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Initialize headers on all 3 sheets
    await GoogleSheetsService.initializeHeaders(spreadsheetId, accessToken);

    // Save config
    GoogleSheetsService.saveConfig({
      spreadsheetId,
      spreadsheetUrl,
      enabled: true,
      autoSync: true,
      lastSyncedAt: new Date().toISOString(),
    });

    return { spreadsheetId, spreadsheetUrl };
  },

  // Initialize column headers on all 3 sheets
  initializeHeaders: async (spreadsheetId: string, accessToken: string): Promise<void> => {
    const batchData = [
      {
        range: `${PROMPTS_TAB}!A1:Q1`,
        values: [PROMPTS_HEADERS],
      },
      {
        range: `${NOTIFICATIONS_TAB}!A1:H1`,
        values: [NOTIFICATIONS_HEADERS],
      },
      {
        range: `${SEARCH_HISTORY_TAB}!A1:G1`,
        values: [SEARCH_HEADERS],
      },
    ];

    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: batchData,
          }),
        }
      );
    } catch (e) {
      console.warn('Headers initialization notice:', e);
    }
  },

  // Ensure tabs exist in an existing spreadsheet
  ensureTabsExist: async (spreadsheetId: string, accessToken: string): Promise<void> => {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!metaRes.ok) return;
      const meta = await metaRes.json();
      const existingTitles = new Set(
        (meta.sheets || []).map((s: any) => s?.properties?.title)
      );

      const requests: any[] = [];
      if (!existingTitles.has(PROMPTS_TAB)) {
        requests.push({ addSheet: { properties: { title: PROMPTS_TAB } } });
      }
      if (!existingTitles.has(NOTIFICATIONS_TAB)) {
        requests.push({ addSheet: { properties: { title: NOTIFICATIONS_TAB } } });
      }
      if (!existingTitles.has(SEARCH_HISTORY_TAB)) {
        requests.push({ addSheet: { properties: { title: SEARCH_HISTORY_TAB } } });
      }

      if (requests.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
          }
        );
      }
    } catch (e) {
      console.warn('Ensure tabs notice:', e);
    }
  },

  // -------------------------------------------------------------
  // PROMPTS TAB SYNC & FETCH
  // -------------------------------------------------------------
  syncPromptsToSheet: async (
    spreadsheetId: string,
    posts: PromptPost[],
    accessToken?: string
  ): Promise<{ success: boolean; count: number }> => {
    if (!spreadsheetId) {
      return { success: false, count: 0 };
    }
    const token = accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    if (!token) {
      console.warn('No access token available for Google Sheets sync.');
      return { success: false, count: 0 };
    }

    try {
      await GoogleSheetsService.ensureTabsExist(spreadsheetId, token);

      // Build rows
      const rows: any[][] = [
        PROMPTS_HEADERS,
        ...posts.map((p) => [
          p.id || '',
          p.title || '',
          p.slug || '',
          p.category || 'General',
          p.aiTool || 'Midjourney',
          p.promptText || '',
          p.negativePrompt || '',
          p.imageUrl || '',
          Array.isArray(p.tags) ? p.tags.join(', ') : '',
          p.status || 'published',
          p.isPremium ? 'TRUE' : 'FALSE',
          Number(p.viewsCount) || 0,
          Number(p.copiesCount) || 0,
          Number(p.likesCount) || 0,
          JSON.stringify(p.parameters || {}),
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString(),
        ]),
      ];

       // 1. Clear old data from Prompts sheet
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${PROMPTS_TAB}!A:Q:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 2. Write headers first
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${PROMPTS_TAB}!A1:Q1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `${PROMPTS_TAB}!A1:Q1`,
            majorDimension: 'ROWS',
            values: [PROMPTS_HEADERS],
          }),
        }
      );

      // 3. Append remaining rows in chunks of 150 to avoid request payload size limits
      const dataRows = rows.slice(1);
      const chunkSize = 150;
      for (let i = 0; i < dataRows.length; i += chunkSize) {
        const chunk = dataRows.slice(i, i + chunkSize);
        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${PROMPTS_TAB}!A:Q:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${PROMPTS_TAB}!A:Q`,
              majorDimension: 'ROWS',
              values: chunk,
            }),
          }
        );
        if (!appendRes.ok) {
          const errText = await appendRes.text();
          console.warn(`Chunk append warning at index ${i}:`, errText);
        }
      }

      // Update config stats
      const conf = await GoogleSheetsService.getConfig();
      conf.lastSyncedAt = new Date().toISOString();
      conf.promptsCount = posts.length;
      GoogleSheetsService.saveConfig(conf);

      return { success: true, count: posts.length };
    } catch (e: any) {
      console.error('syncPromptsToSheet error:', e);
      return { success: false, count: 0 };
    }
  },

  fetchPromptsFromSheet: async (
    spreadsheetId: string,
    accessToken?: string
  ): Promise<PromptPost[]> => {
    if (!spreadsheetId) return [];
    const token = accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

    let rows: any[][] = [];

    // Attempt 1: Authenticated API v4
    if (token) {
      try {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${PROMPTS_TAB}!A2:Q?valueRenderOption=UNFORMATTED_VALUE`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.values)) {
            rows = json.values;
          }
        }
      } catch (err) {
        console.warn('Google Sheets API v4 read notice:', err);
      }
    }

    // Attempt 2: Public JSON GViz export fallback if sheet is shared with link
    if (rows.length === 0) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          PROMPTS_TAB
        )}`;
        const gvizRes = await fetch(gvizUrl, { cache: 'no-store' });
        if (gvizRes.ok) {
          const text = await gvizRes.text();
          const jsonStr = text.replace(/^[^{]*\(/, '').replace(/\);?$/, '');
          const parsed = JSON.parse(jsonStr);
          const tableRows = parsed?.table?.rows;
          if (Array.isArray(tableRows)) {
            rows = tableRows.map((r: any) => (r.c || []).map((c: any) => c?.v ?? ''));
          }
        }
      } catch (gvizErr) {
        // ignore
      }
    }

    if (rows.length === 0) return [];

    return rows
      .map((r, idx) => {
        const id = String(r[0] || `prompt-${Date.now()}-${idx}`).trim();
        const title = String(r[1] || '').trim();
        const slug =
          String(r[2] || '').trim() ||
          title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
          `prompt-${idx + 1}`;
        const category = String(r[3] || 'General').trim();
        const aiTool: any = String(r[4] || 'Midjourney').trim();
        const promptText = String(r[5] || title).trim();
        const negativePrompt = String(r[6] || '').trim();
        const imageUrl = String(r[7] || '').trim();
        const tagsRaw = String(r[8] || '');
        const tags = tagsRaw
          ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
          : ['AI Prompt'];
        const status: any = String(r[9] || 'published').toLowerCase() === 'draft' ? 'draft' : 'published';
        const isPremium = String(r[10] || '').toLowerCase() === 'true';
        const viewsCount = Number(r[11]) || 0;
        const copiesCount = Number(r[12]) || 0;
        const likesCount = Number(r[13]) || 0;

        let parameters: any = {};
        try {
          if (r[14]) parameters = JSON.parse(String(r[14]));
        } catch {
          // ignore
        }

        const createdAt = String(r[15] || new Date().toISOString());
        const updatedAt = String(r[16] || createdAt);

        if (!promptText && !title) return null;

        return {
          id,
          title: title || 'Untitled Prompt',
          slug,
          category,
          aiTool,
          promptText,
          negativePrompt,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
          tags,
          status,
          isPremium,
          viewsCount,
          copiesCount,
          likesCount,
          parameters,
          articleContent: '',
          author: {
            name: 'tool.reelz',
            avatar: '/logo.png',
            role: 'Author',
          },
          seo: {
            metaTitle: title,
            metaDescription: promptText.slice(0, 155),
            focusKeyword: category,
          },
          createdAt,
          updatedAt,
          publishedAt: createdAt,
        } as PromptPost;
      })
      .filter((p): p is PromptPost => p !== null);
  },

  // -------------------------------------------------------------
  // NOTIFICATIONS TAB SYNC & FETCH
  // -------------------------------------------------------------
  syncNotificationsToSheet: async (
    spreadsheetId: string,
    items: PushNotificationItem[],
    accessToken?: string
  ): Promise<{ success: boolean; count: number }> => {
    if (!spreadsheetId) return { success: false, count: 0 };
    const token = accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    if (!token) return { success: false, count: 0 };

    try {
      await GoogleSheetsService.ensureTabsExist(spreadsheetId, token);

      const rows: any[][] = [
        NOTIFICATIONS_HEADERS,
        ...items.map((n) => [
          n.id || '',
          n.title || '',
          n.subtitle || '',
          n.body || '',
          n.category || 'all',
          n.imageUrl || '',
          n.url || '',
          n.sentAt || new Date().toISOString(),
        ]),
      ];

      // Clear old rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${NOTIFICATIONS_TAB}!A:H:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Write updated rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${NOTIFICATIONS_TAB}!A1:H${rows.length}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `${NOTIFICATIONS_TAB}!A1:H${rows.length}`,
            majorDimension: 'ROWS',
            values: rows,
          }),
        }
      );

      const conf = GoogleSheetsService.getConfig();
      conf.notificationsCount = items.length;
      GoogleSheetsService.saveConfig(conf);

      return { success: true, count: items.length };
    } catch (e: any) {
      console.error('syncNotificationsToSheet error:', e);
      return { success: false, count: 0 };
    }
  },

  fetchNotificationsFromSheet: async (
    spreadsheetId: string,
    accessToken?: string
  ): Promise<PushNotificationItem[]> => {
    if (!spreadsheetId) return [];
    const token = accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

    let rows: any[][] = [];

    if (token) {
      try {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${NOTIFICATIONS_TAB}!A2:H?valueRenderOption=UNFORMATTED_VALUE`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.values)) {
            rows = json.values;
          }
        }
      } catch (err) {
        console.warn('Google Sheets fetchNotifications notice:', err);
      }
    }

    if (rows.length === 0) return [];

    return rows
      .map((r, idx) => {
        const id = String(r[0] || `notif_${Date.now()}_${idx}`).trim();
        const title = String(r[1] || '').trim();
        const subtitle = String(r[2] || '').trim();
        const body = String(r[3] || '').trim();
        const category = String(r[4] || 'all').trim();
        const imageUrl = String(r[5] || '').trim();
        const url = String(r[6] || '').trim();
        const sentAt = String(r[7] || new Date().toISOString());

        if (!title && !body) return null;

        return {
          id,
          title,
          subtitle,
          body,
          category,
          imageUrl,
          url,
          sentAt,
        } as PushNotificationItem;
      })
      .filter((n): n is PushNotificationItem => n !== null);
  },

  // -------------------------------------------------------------
  // SEARCH HISTORY TAB SYNC & FETCH
  // -------------------------------------------------------------
  syncSearchHistoryToSheet: async (
    spreadsheetId: string,
    queries: SearchQueryItem[],
    accessToken?: string
  ): Promise<{ success: boolean; count: number }> => {
    if (!spreadsheetId) return { success: false, count: 0 };
    const token = accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    if (!token) return { success: false, count: 0 };

    try {
      await GoogleSheetsService.ensureTabsExist(spreadsheetId, token);

      const rows: any[][] = [
        SEARCH_HEADERS,
        ...queries.map((q) => [
          q.id || '',
          q.query || '',
          Number(q.count) || 1,
          Number(q.resultsCount) || 0,
          q.category || 'all',
          q.lastSearched || '',
          q.createdAt || new Date().toISOString(),
        ]),
      ];

      // Clear old rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SEARCH_HISTORY_TAB}!A:G:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Write updated rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SEARCH_HISTORY_TAB}!A1:G${rows.length}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `${SEARCH_HISTORY_TAB}!A1:G${rows.length}`,
            majorDimension: 'ROWS',
            values: rows,
          }),
        }
      );

      const conf = GoogleSheetsService.getConfig();
      conf.searchQueriesCount = queries.length;
      GoogleSheetsService.saveConfig(conf);

      return { success: true, count: queries.length };
    } catch (e: any) {
      console.error('syncSearchHistoryToSheet error:', e);
      return { success: false, count: 0 };
    }
  },

  fetchSearchHistoryFromSheet: async (
    spreadsheetId: string,
    accessToken?: string
  ): Promise<SearchQueryItem[]> => {
    if (!spreadsheetId) return [];
    const token = accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

    let rows: any[][] = [];

    if (token) {
      try {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SEARCH_HISTORY_TAB}!A2:G?valueRenderOption=UNFORMATTED_VALUE`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.values)) {
            rows = json.values;
          }
        }
      } catch (err) {
        console.warn('Google Sheets fetchSearchHistory notice:', err);
      }
    }

    if (rows.length === 0) return [];

    return rows
      .map((r, idx) => {
        const id = String(r[0] || `sq_${Date.now()}_${idx}`).trim();
        const query = String(r[1] || '').trim();
        const count = Number(r[2]) || 1;
        const resultsCount = Number(r[3]) || 0;
        const category = String(r[4] || 'all').trim();
        const lastSearched = r[5] ? Number(r[5]) || r[5] : Date.now();
        const createdAt = String(r[6] || new Date().toISOString());

        if (!query) return null;

        return {
          id,
          query,
          count,
          resultsCount,
          category,
          lastSearched,
          createdAt,
        } as SearchQueryItem;
      })
      .filter((q): q is SearchQueryItem => q !== null);
  },

  // -------------------------------------------------------------
  // ALL-IN-ONE MASTER MIGRATION / EXPORT
  // -------------------------------------------------------------
  exportAllToGoogleSheet: async (
    spreadsheetId: string,
    data: {
      posts?: PromptPost[];
      notifications?: PushNotificationItem[];
      searchQueries?: SearchQueryItem[];
    },
    accessToken?: string
  ): Promise<{
    promptsCount: number;
    notificationsCount: number;
    searchQueriesCount: number;
  }> => {
    let promptsCount = 0;
    let notificationsCount = 0;
    let searchQueriesCount = 0;

    if (Array.isArray(data.posts) && data.posts.length > 0) {
      const res = await GoogleSheetsService.syncPromptsToSheet(spreadsheetId, data.posts, accessToken);
      promptsCount = res.count;
    }

    if (Array.isArray(data.notifications) && data.notifications.length > 0) {
      const res = await GoogleSheetsService.syncNotificationsToSheet(spreadsheetId, data.notifications, accessToken);
      notificationsCount = res.count;
    }

    if (Array.isArray(data.searchQueries) && data.searchQueries.length > 0) {
      const res = await GoogleSheetsService.syncSearchHistoryToSheet(spreadsheetId, data.searchQueries, accessToken);
      searchQueriesCount = res.count;
    }

    return {
      promptsCount,
      notificationsCount,
      searchQueriesCount,
    };
  },
};
