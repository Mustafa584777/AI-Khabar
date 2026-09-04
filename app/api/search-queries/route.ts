import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
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
