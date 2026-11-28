import { ServerStorage } from '@/lib/server-storage';
import { pushSiteMetaSnapshotToAssetsRepo } from '@/lib/github-assets-server';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 604800;

async function syncMetaToCdn() {
  try {
    const [categories, tags, settings, topQueries] = await Promise.all([
      ServerStorage.getAllCategories(),
      ServerStorage.getAllTags(),
      ServerStorage.getSettings(),
      ServerStorage.getTopSearchQueries(12),
    ]);
    await pushSiteMetaSnapshotToAssetsRepo({
      categories,
      tags,
      settings,
      searchQueries: topQueries.map((q) => q.query).filter(Boolean),
    });
  } catch {}
}

export async function GET() {
  try {
    const settings = await ServerStorage.getSettings();
    return NextResponse.json(
      { success: true, settings },
      {
        headers: {
          'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await ServerStorage.saveSettings(body);
    void syncMetaToCdn();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
