import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const queries = await ServerStorage.getPopularSearchQueriesCached();
    return NextResponse.json(
      { queries },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=259200, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error in popular search queries API:', error);
    return NextResponse.json({ queries: [] }, { status: 500 });
  }
}
