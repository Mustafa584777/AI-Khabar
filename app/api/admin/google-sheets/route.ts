import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { getGoogleSheetConfig, saveGoogleSheetConfig, fetchPostsFromGoogleSheet, generatePostsCsv } from '@/lib/google-sheets';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'export-csv') {
    try {
      const posts = await ServerStorage.getAllPosts(true);
      const csv = generatePostsCsv(posts);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="aura-prompts-export.csv"',
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  const config = getGoogleSheetConfig();
  return NextResponse.json({ success: true, config });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sheetId, apiKey, enabled } = body;

    if (action === 'save-config') {
      const updated = await saveGoogleSheetConfig({ sheetId, apiKey, enabled });
      return NextResponse.json({ success: true, config: updated, message: 'Google Sheet settings saved successfully!' });
    }

    if (action === 'sync-from-sheet') {
      const config = getGoogleSheetConfig();
      if (!config.sheetId && !sheetId) {
        return NextResponse.json({ success: false, error: 'Google Sheet ID is required.' }, { status: 400 });
      }
      if (sheetId) {
        await saveGoogleSheetConfig({ sheetId, apiKey, enabled: true });
      }

      const sheetPosts = await fetchPostsFromGoogleSheet();
      if (sheetPosts.length > 0) {
        const restored = await ServerStorage.restorePosts(sheetPosts, 'merge');
        return NextResponse.json({
          success: true,
          count: restored.length,
          message: `Successfully synchronized ${restored.length} prompts from Google Sheet!`,
          posts: restored,
        });
      } else {
        return NextResponse.json({ success: false, error: 'No posts found in Google Sheet.' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('Google Sheets API error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Operation failed' }, { status: 500 });
  }
}
