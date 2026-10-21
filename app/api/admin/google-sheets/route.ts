import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService, extractSpreadsheetId } from '@/lib/google-sheets';
import { ServerStorage } from '@/lib/server-storage';
import { NotificationServerStore } from '@/lib/notification-storage';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

export async function GET() {
  try {
    const config = await GoogleSheetsService.getConfigAsync();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const authHeader = req.headers.get('authorization') || '';
    const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const accessToken = body.accessToken || headerToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

    // 1. SAVE CONFIG
    if (action === 'save-config') {
      const cleanId = extractSpreadsheetId(body.spreadsheetId || '');
      const updated = await GoogleSheetsService.saveConfigAsync({
        spreadsheetId: cleanId,
        spreadsheetUrl: cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '',
        enabled: Boolean(body.enabled && cleanId),
        autoSync: Boolean(body.autoSync),
      });
      return NextResponse.json({
        success: true,
        message: 'Google Sheets configuration saved and persisted permanently.',
        config: updated,
      });
    }

    // Gather all posts reliably from file and storage
    const getComprehensivePosts = async () => {
      let posts: any[] = [];
      try {
        if (fs.existsSync(POSTS_FILE)) {
          const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) posts = parsed;
        }
      } catch {}
      const storagePosts = await ServerStorage.getAllPosts(true);
      const map = new Map<string, any>();
      for (const p of posts) if (p?.id) map.set(p.id, p);
      for (const p of storagePosts) if (p?.id) map.set(p.id, p);
      return Array.from(map.values());
    };

    // Gather all notifications reliably
    const getComprehensiveNotifications = async () => {
      let notifs = await NotificationServerStore.getNotifications();
      if (!Array.isArray(notifs) || notifs.length === 0) {
        notifs = [
          {
            id: 'notif_default_1',
            title: 'Welcome to AI Khabar Prompts',
            subtitle: 'Explore 260+ Curated AI Prompts',
            body: 'Discover state-of-the-art Midjourney, Stable Diffusion, and DALL-E 3 prompts synced instantly via Google Sheets.',
            category: 'all',
            imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
            url: '/create',
            sentAt: new Date().toISOString(),
          },
        ];
      }
      return notifs;
    };

    // 2. CREATE NEW SPREADSHEET
    if (action === 'create-sheet') {
      if (!accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google authorization is required. Please sign in with Google first.',
          },
          { status: 401 }
        );
      }

      const title = body.title || 'AI-Khabar CMS Database';
      const result = await GoogleSheetsService.createSpreadsheet(accessToken, title);

      const [allPosts, allNotifications, allSearchQueries] = await Promise.all([
        getComprehensivePosts(),
        getComprehensiveNotifications(),
        ServerStorage.getSearchQueries(200),
      ]);

      const counts = await GoogleSheetsService.exportAllToGoogleSheet(
        result.spreadsheetId,
        {
          posts: allPosts,
          notifications: allNotifications,
          searchQueries: allSearchQueries,
        },
        accessToken
      );

      const newConfig = await GoogleSheetsService.getConfigAsync();

      return NextResponse.json({
        success: true,
        message: `Created spreadsheet "${title}" and synced ${counts.promptsCount} prompts, ${counts.notificationsCount} notifications, and ${counts.searchQueriesCount} search queries.`,
        config: newConfig,
        counts,
      });
    }

    // 3. MIGRATE ALL TO GOOGLE SHEET
    if (action === 'migrate-all') {
      const config = await GoogleSheetsService.getConfigAsync();
      const targetId = extractSpreadsheetId(body.spreadsheetId || config.spreadsheetId);

      if (!targetId) {
        return NextResponse.json(
          {
            success: false,
            error: 'No Google Spreadsheet ID provided or configured.',
          },
          { status: 400 }
        );
      }

      const [allPosts, allNotifications, allSearchQueries] = await Promise.all([
        getComprehensivePosts(),
        getComprehensiveNotifications(),
        ServerStorage.getSearchQueries(200),
      ]);

      const counts = await GoogleSheetsService.exportAllToGoogleSheet(
        targetId,
        {
          posts: allPosts,
          notifications: allNotifications,
          searchQueries: allSearchQueries,
        },
        accessToken
      );

      return NextResponse.json({
        success: true,
        message: `Successfully migrated to Google Sheet: ${counts.promptsCount} prompts, ${counts.notificationsCount} notification cards, ${counts.searchQueriesCount} search history queries.`,
        counts,
      });
    }

    // 4. IMPORT / SYNC FROM GOOGLE SHEET
    if (action === 'import-all') {
      const config = await GoogleSheetsService.getConfigAsync();
      const targetId = extractSpreadsheetId(body.spreadsheetId || config.spreadsheetId);

      if (!targetId) {
        return NextResponse.json(
          {
            success: false,
            error: 'No Google Spreadsheet ID provided or configured.',
          },
          { status: 400 }
        );
      }

      const [sheetPosts, sheetNotifications, sheetQueries] = await Promise.all([
        GoogleSheetsService.fetchPromptsFromSheet(targetId, accessToken),
        GoogleSheetsService.fetchNotificationsFromSheet(targetId, accessToken),
        GoogleSheetsService.fetchSearchHistoryFromSheet(targetId, accessToken),
      ]);

      if (sheetPosts.length === 0 && sheetNotifications.length === 0 && sheetQueries.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No data found in Google Sheet. Make sure the spreadsheet has "Prompts", "Notifications", or "SearchHistory" tabs and is accessible.',
          },
          { status: 404 }
        );
      }

      if (sheetPosts.length > 0) {
        await ServerStorage.restorePosts(sheetPosts, 'merge', accessToken);
      }
      if (sheetNotifications.length > 0) {
        await NotificationServerStore.saveNotifications(sheetNotifications, accessToken);
      }
      if (sheetQueries.length > 0) {
        await ServerStorage.restoreSearchQueries(sheetQueries);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully imported from Google Sheet: ${sheetPosts.length} prompts, ${sheetNotifications.length} notifications, ${sheetQueries.length} search queries.`,
        imported: {
          prompts: sheetPosts.length,
          notifications: sheetNotifications.length,
          searchQueries: sheetQueries.length,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('API Google Sheets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
