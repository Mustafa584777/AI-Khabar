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
    const tags = await ServerStorage.getAllTags();
    return NextResponse.json(
      { success: true, tags },
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
    if (!body.tag) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }
    const tags = await ServerStorage.addTag(body.tag);
    void syncMetaToCdn();
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    if (!tag) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }
    const tags = await ServerStorage.deleteTag(tag);
    void syncMetaToCdn();
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
