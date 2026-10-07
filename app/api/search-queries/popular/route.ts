import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const queries = await ServerStorage.getPopularSearchQueriesCached();
    return NextResponse.json({ queries });
  } catch (error) {
    console.error('Error in popular search queries API:', error);
    return NextResponse.json({ queries: [] }, { status: 500 });
  }
}
