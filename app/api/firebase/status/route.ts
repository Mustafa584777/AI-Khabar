import { NextResponse } from 'next/server';
import { db, isFirebaseConfigured, testFirebaseConnection } from '@/lib/firebase';
import firebaseConfig from '@/firebase-applet-config.json';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isFirebaseConfigured();
  const status = {
    configured,
    connected: false,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    collections: {
      posts: true,
      categories: true,
      settings: true,
      tags: true,
      searchQueries: true,
      users: true,
    },
    quotaStatus: 'normal' as 'normal' | 'exhausted',
    error: null as string | null,
  };

  if (!configured) {
    return NextResponse.json(status);
  }

  try {
    const isConn = await testFirebaseConnection();
    status.connected = isConn;
  } catch (err: any) {
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      status.quotaStatus = 'exhausted';
      status.error = 'Firebase Daily Free Tier Quota Exceeded. Resets daily at midnight PST.';
      status.connected = true; // Still configured and authenticating properly
    } else {
      status.error = err instanceof Error ? err.message : 'Connection test notice';
    }
  }

  return NextResponse.json(status);
}
