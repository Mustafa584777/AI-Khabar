import { NextRequest, NextResponse } from 'next/server';
import { getOptimizedImageUrl } from '@/lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import { extractCloudinaryAssetPath } from '@/lib/github-assets-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = (searchParams.get('url') || '').trim();

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
  }

  let targetUrl = getOptimizedImageUrl(rawUrl, 1200);

  // Also check live Firestore redirect registry in case new mapping was created on serverless runtime
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'settings', 'media_redirects'));
      if (snap.exists()) {
        const redirectsMap = (snap.data()?.map || {}) as Record<string, string>;
        const cleanUrl = rawUrl.split('?')[0].trim();
        const assetPath = extractCloudinaryAssetPath(rawUrl);
        if (redirectsMap[rawUrl]) {
          targetUrl = redirectsMap[rawUrl];
        } else if (redirectsMap[cleanUrl]) {
          targetUrl = redirectsMap[cleanUrl];
        } else if (assetPath && redirectsMap[assetPath]) {
          targetUrl = redirectsMap[assetPath];
        }
      }
    } catch {
      // Fall back to deterministic mapping
    }
  }

  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return NextResponse.json({ error: 'Unable to resolve target media URL' }, { status: 404 });
  }

  return NextResponse.redirect(targetUrl, 301);
}
