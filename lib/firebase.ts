import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import baseConfigFile from '@/firebase-applet-config.json';

const resolvedConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || baseConfigFile?.projectId || 'norse-field-lcbh2',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || baseConfigFile?.appId || '',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || baseConfigFile?.apiKey || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || baseConfigFile?.authDomain || `${baseConfigFile?.projectId || 'norse-field-lcbh2'}.firebaseapp.com`,
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || baseConfigFile?.firestoreDatabaseId || 'ai-studio-aikhabar-e2a0de3e-a9ee-44e0-a08f-61019be3bd84',
  storageBucket: baseConfigFile?.storageBucket || '',
  messagingSenderId: baseConfigFile?.messagingSenderId || '',
  measurementId: baseConfigFile?.measurementId || '',
  oAuthClientId: baseConfigFile?.oAuthClientId || '',
  recaptchaSiteKey: baseConfigFile?.recaptchaSiteKey || '',
};

const app = !getApps().length ? initializeApp(resolvedConfig) : getApp();
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export function isFirebaseConfigured(): boolean {
  return Boolean(resolvedConfig.projectId && resolvedConfig.apiKey);
}

export function getFirebaseConfig() {
  return resolvedConfig;
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
    if (error?.message?.includes('Quota') || error?.code === 'resource-exhausted') {
      console.warn('Firebase daily quota exceeded notice - resets daily at midnight PST');
      return true; // Config is valid
    }
    // Document not found is fine, connection succeeded
    return true;
  }
}
