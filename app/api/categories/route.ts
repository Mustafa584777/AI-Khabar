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
    const categories = await ServerStorage.getAllCategories();
    return NextResponse.json(
      { success: true, categories },
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
    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    const saved = await ServerStorage.saveCategory(body);
    void syncMetaToCdn();
    return NextResponse.json({ success: true, category: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    const deleted = await ServerStorage.deleteCategory(id);
    const categories = await ServerStorage.getAllCategories();
    void syncMetaToCdn();
    return NextResponse.json({ success: deleted, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
