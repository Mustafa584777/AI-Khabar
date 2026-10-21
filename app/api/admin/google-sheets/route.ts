import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService, extractSpreadsheetId } from '@/lib/google-sheets';
import { ServerStorage } from '@/lib/server-storage';
import { NotificationServerStore } from '@/lib/notification-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const config = GoogleSheetsService.getConfig();
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
      const updated = GoogleSheetsService.saveConfig({
        spreadsheetId: cleanId,
        spreadsheetUrl: cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '',
        enabled: Boolean(body.enabled && cleanId),
        autoSync: Boolean(body.autoSync),
      });
      return NextResponse.json({
        success: true,
        message: 'Google Sheets configuration updated.',
        config: updated,
      });
    }

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

      // Now auto-populate with existing data
      const [allPosts, allNotifications, allSearchQueries] = await Promise.all([
        ServerStorage.getAllPosts(true),
        NotificationServerStore.getNotifications(),
        ServerStorage.getSearchQueries(100),
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

      const newConfig = GoogleSheetsService.getConfig();

      return NextResponse.json({
        success: true,
        message: `Created spreadsheet "${title}" and synced ${counts.promptsCount} prompts, ${counts.notificationsCount} notifications, and ${counts.searchQueriesCount} search queries.`,
        config: newConfig,
        counts,
      });
    }

    // 3. MIGRATE ALL TO GOOGLE SHEET
    if (action === 'migrate-all') {
      const config = GoogleSheetsService.getConfig();
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
        ServerStorage.getAllPosts(true),
        NotificationServerStore.getNotifications(),
        ServerStorage.getSearchQueries(100),
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
      const config = GoogleSheetsService.getConfig();
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

      // Restore into ServerStorage and NotificationServerStore
      if (sheetPosts.length > 0) {
        await ServerStorage.restorePosts(sheetPosts, 'merge');
      }
      if (sheetNotifications.length > 0) {
        await NotificationServerStore.saveNotifications(sheetNotifications);
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
