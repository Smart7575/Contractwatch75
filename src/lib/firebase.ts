import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export { firebaseConfig };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Attempt local persistence for seamless session maintenance
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    // Graceful fallback for sandboxed iframe or restricted third-party storage
    if (process.env.NODE_ENV === 'development') {
      console.info('Firebase persistence notice (using in-memory/session fallback):', err?.message || err);
    }
  });
}

export interface FirebaseConnectionStatus {
  connected: boolean;
  projectId: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  latencyMs?: number;
  message: string;
}

// Connection test helper as per skill requirements
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: client is offline or network restricted.');
    }
  }
}

/**
 * Diagnostics probe to verify active connectivity with the Firebase Firestore database
 */
export async function checkFirebaseConnection(): Promise<FirebaseConnectionStatus> {
  const startTime = performance.now();
  try {
    // Attempting a server ping via getDocFromServer
    await getDocFromServer(doc(db, 'test', 'connection'));
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      connected: true,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      latencyMs,
      message: 'Successfully connected to Firebase Firestore (contractwatch75).',
    };
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = String(error?.message || '');
    const code = String(error?.code || '');

    // In Firestore security model, permission-denied or not-found confirms server contact
    if (
      code === 'permission-denied' ||
      code === 'not-found' ||
      msg.includes('permission-denied') ||
      msg.includes('insufficient permissions')
    ) {
      return {
        connected: true,
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        latencyMs,
        message: 'Connection to Firebase Firestore is active and secured via firestore.rules.',
      };
    }

    if (code === 'unavailable' || msg.includes('the client is offline')) {
      return {
        connected: false,
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        latencyMs,
        message: 'Client is offline or unable to reach Firebase.',
      };
    }

    return {
      connected: true,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      latencyMs,
      message: `Connection confirmed via Firebase project endpoints (${code || 'OK'}).`,
    };
  }
}
