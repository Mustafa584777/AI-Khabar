import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const queries = await ServerStorage.getPopularSearchQueriesCached();
    return NextResponse.json(
      { success: true, queries },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=259200, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ success: true, queries: [] });
  }
}
