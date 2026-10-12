import { NextResponse } from 'next/server';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import firebaseConfig from '@/firebase-applet-config.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configured = isFirebaseConfigured();
    return NextResponse.json({
      success: true,
      connected: configured,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, connected: false, error: error.message }, { status: 500 });
  }
}
