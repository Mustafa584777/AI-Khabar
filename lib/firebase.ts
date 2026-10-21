import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-aikhabar-e2a0de3e-a9ee-44e0-a08f-61019be3bd84';
export const db = getFirestore(app, firestoreDbId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig && firebaseConfig.projectId && firebaseConfig.apiKey);
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
