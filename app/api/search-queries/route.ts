import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const getAll = searchParams.get('all') === 'true';
    if (getAll) {
      const queries = await ServerStorage.getAllSearchQueries();
      return NextResponse.json({ success: true, queries });
    }
    const limitParam = parseInt(searchParams.get('limit') || '12', 10);
    const queries = await ServerStorage.getTopSearchQueries(limitParam);
    return NextResponse.json({ success: true, queries });
  } catch (err: any) {
    console.error('Failed to get search queries:', err);
    return NextResponse.json({ error: 'Failed to fetch search queries', details: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query;
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }
    await ServerStorage.recordSearchQuery(query);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to record search query:', err);
    return NextResponse.json({ error: 'Failed to record search query', details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get('all') === 'true';
    const queryParam = searchParams.get('query');

    if (clearAll) {
      await ServerStorage.clearAllSearchQueries();
      return NextResponse.json({ success: true, message: 'All search queries cleared' });
    }

    if (queryParam) {
      const updated = await ServerStorage.deleteSearchQuery(queryParam);
      return NextResponse.json({ success: true, queries: updated });
    }

    const body = await req.json().catch(() => ({}));
    if (body.all) {
      await ServerStorage.clearAllSearchQueries();
      return NextResponse.json({ success: true, message: 'All search queries cleared' });
    }
    if (body.query) {
      const updated = await ServerStorage.deleteSearchQuery(body.query);
      return NextResponse.json({ success: true, queries: updated });
    }

    return NextResponse.json({ error: 'Query parameter or body required' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to delete search query:', err);
    return NextResponse.json({ error: 'Failed to delete search query', details: err.message }, { status: 500 });
  }
}
