import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import firebaseConfig from '@/firebase-applet-config.json';
import { db, isFirebaseConfigured } from './firebase-db';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export { db, isFirebaseConfigured };
export const auth = getAuth(app);

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase configuration notice: client is offline');
      return false;
    }
    return true;
  }
}
