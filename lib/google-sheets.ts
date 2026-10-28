import fs from 'fs';
import path from 'path';
import { PromptPost, SearchQueryItem } from '@/types/prompt';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export interface GoogleSheetConfig {
  sheetId: string;
  apiKey?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
  enabled: boolean;
}

export function getGoogleSheetConfig(): GoogleSheetConfig {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data?.googleSheet) {
        return {
          sheetId: data.googleSheet.sheetId || process.env.GOOGLE_SHEET_ID || '',
          apiKey: data.googleSheet.apiKey || process.env.GOOGLE_SHEET_API_KEY || '',
          serviceAccountEmail: data.googleSheet.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
          privateKey: data.googleSheet.privateKey || process.env.GOOGLE_PRIVATE_KEY || '',
          enabled: Boolean(data.googleSheet.enabled || process.env.GOOGLE_SHEET_ID),
        };
      }
    }
  } catch (e) {
    console.error('Error reading Google Sheet config:', e);
  }

  return {
    sheetId: process.env.GOOGLE_SHEET_ID || '',
    apiKey: process.env.GOOGLE_SHEET_API_KEY || '',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY || '',
    enabled: Boolean(process.env.GOOGLE_SHEET_ID),
  };
}

export async function saveGoogleSheetConfig(config: Partial<GoogleSheetConfig>): Promise<GoogleSheetConfig> {
  try {
    let settings: any = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
    settings.googleSheet = {
      ...(settings.googleSheet || {}),
      ...config,
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return getGoogleSheetConfig();
  } catch (e) {
    console.error('Error saving Google Sheet config:', e);
    throw e;
  }
}

/**
 * Fetch posts from Google Sheet using public CSV export or Google Sheets API.
 */
export async function fetchPostsFromGoogleSheet(): Promise<PromptPost[]> {
  const config = getGoogleSheetConfig();
  if (!config.sheetId) {
    throw new Error('Google Sheet ID is not configured.');
  }

  try {
    // Try public CSV export first (works if sheet is shared with anyone with link)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/export?format=csv&gid=0`;
    const res = await fetch(csvUrl, { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`Failed to fetch Google Sheet CSV: ${res.statusText}`);
    }
    const csvText = await res.text();
    const posts = parseCsvToPosts(csvText);
    return posts;
  } catch (err: any) {
    console.error('Error fetching from Google Sheet CSV, trying API:', err);
    if (config.apiKey) {
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/Sheet1!A1:Z1000?key=${config.apiKey}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const json = await apiRes.json();
        const rows = json.values || [];
        if (rows.length > 1) {
          return parseRowsToPosts(rows);
        }
      }
    }
    throw err;
  }
}

function parseCsvToPosts(csvText: string): PromptPost[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const posts: PromptPost[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });

    if (!obj['id'] && !obj['title']) continue;

    posts.push({
      id: obj['id'] || `prompt-${Date.now()}-${i}`,
      title: obj['title'] || 'Untitled Prompt',
      slug: obj['slug'] || (obj['title'] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      promptText: obj['prompttext'] || obj['prompt'] || '',
      negativePrompt: obj['negativeprompt'] || '',
      category: obj['category'] || 'General',
      aiTool: obj['aitool'] || obj['tool'] || 'Midjourney',
      imageUrl: obj['imageurl'] || obj['image'] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      imageAlt: obj['imagealt'] || obj['title'] || '',
      isPremium: obj['ispremium'] === 'true' || obj['ispremium'] === '1',
      tags: obj['tags'] ? obj['tags'].split(',').map((t) => t.trim()).filter(Boolean) : ['AI Prompt'],
      author: {
        name: obj['authorname'] || 'tool.reelz',
        avatar: obj['authoravatar'] || '/logo.png',
        role: obj['authorrole'] || 'Author',
      },
      createdAt: obj['createdat'] || new Date().toISOString(),
      viewsCount: parseInt(obj['viewscount'] || '50', 10),
      copiesCount: parseInt(obj['copiescount'] || '10', 10),
      likesCount: parseInt(obj['likescount'] || '5', 10),
      status: (obj['status'] as any) || 'published',
    });
  }

  return posts;
}

function parseRowsToPosts(rows: string[][]): PromptPost[] {
  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const posts: PromptPost[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });

    if (!obj['id'] && !obj['title']) continue;

    posts.push({
      id: obj['id'] || `prompt-${Date.now()}-${i}`,
      title: obj['title'] || 'Untitled Prompt',
      slug: obj['slug'] || '',
      promptText: obj['prompttext'] || obj['prompt'] || '',
      negativePrompt: obj['negativeprompt'] || '',
      category: obj['category'] || 'General',
      aiTool: obj['aitool'] || 'Midjourney',
      imageUrl: obj['imageurl'] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      imageAlt: obj['imagealt'] || '',
      isPremium: obj['ispremium'] === 'true' || obj['ispremium'] === '1',
      tags: obj['tags'] ? obj['tags'].split(',').map((t) => t.trim()).filter(Boolean) : [],
      author: {
        name: obj['authorname'] || 'tool.reelz',
        avatar: obj['authoravatar'] || '/logo.png',
        role: obj['authorrole'] || 'Author',
      },
      createdAt: obj['createdat'] || new Date().toISOString(),
      viewsCount: parseInt(obj['viewscount'] || '50', 10),
      copiesCount: parseInt(obj['copiescount'] || '10', 10),
      likesCount: parseInt(obj['likescount'] || '5', 10),
      status: (obj['status'] as any) || 'published',
    });
  }

  return posts;
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Export posts to CSV format suitable for copy-pasting into Google Sheets or downloading.
 */
export function generatePostsCsv(posts: PromptPost[]): string {
  const headers = [
    'ID',
    'Title',
    'Slug',
    'PromptText',
    'NegativePrompt',
    'Category',
    'AiTool',
    'ImageUrl',
    'ImageAlt',
    'IsPremium',
    'Tags',
    'AuthorName',
    'CreatedAt',
    'ViewsCount',
    'CopiesCount',
    'LikesCount',
    'Status',
  ];

  const rows = posts.map((p) => [
    escapeCsv(p.id),
    escapeCsv(p.title),
    escapeCsv(p.slug),
    escapeCsv(p.promptText),
    escapeCsv(p.negativePrompt || ''),
    escapeCsv(p.category),
    escapeCsv(p.aiTool),
    escapeCsv(p.imageUrl),
    escapeCsv(p.imageAlt || ''),
    escapeCsv(String(p.isPremium || false)),
    escapeCsv((p.tags || []).join(', ')),
    escapeCsv(p.author?.name || 'tool.reelz'),
    escapeCsv(p.createdAt || ''),
    escapeCsv(String(p.viewsCount || 0)),
    escapeCsv(String(p.copiesCount || 0)),
    escapeCsv(String(p.likesCount || 0)),
    escapeCsv(p.status || 'published'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function escapeCsv(val: string): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
