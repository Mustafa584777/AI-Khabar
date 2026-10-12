import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import baseConfig from '@/firebase-applet-config.json';

// Support both firebase-applet-config.json and optional Vercel environment variables
const resolvedConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || baseConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || baseConfig.appId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || baseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || baseConfig.authDomain,
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID ||
    baseConfig.firestoreDatabaseId ||
    '(default)',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || baseConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || baseConfig.messagingSenderId,
  measurementId: baseConfig.measurementId || '',
};

export const activeFirestoreDatabaseId = resolvedConfig.firestoreDatabaseId;

const app = !getApps().length ? initializeApp(resolvedConfig) : getApp();

/* CRITICAL: Must pass database ID so Firestore connects to the provisioned database */
export const db = resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export function isFirebaseConfigured(): boolean {
  return Boolean(resolvedConfig.projectId && resolvedConfig.apiKey);
}

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase configuration notice: client is offline');
      return false;
    }
    // Document not found is fine, connection succeeded
    return true;
  }
}
