import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function ensureAuthUser(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.warn('[Firebase Auth] Anonymous auth fallback:', err);
    return 'anonymous_' + Math.random().toString(36).substring(2, 10);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await ensureAuthUser();
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection active.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('[Firebase] Client is offline or unreachable.');
    }
    return false;
  }
}

// User sign in helper using popup
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('[Firebase Auth] Google login error:', err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function sanitizeId(rawId: string): string {
  if (!rawId) return `id_${Date.now()}`;
  const sanitized = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return (sanitized || `id_${Date.now()}`).substring(0, 120);
}

// Helpers for persisting audits and start mode projects
export async function saveDiagnosisToFirestore(diagnosisData: any, userId?: string) {
  const uid = userId || auth.currentUser?.uid || (await ensureAuthUser());
  const rawId = diagnosisData.id || `diag_${Date.now()}`;
  const docId = sanitizeId(rawId);
  const docRef = doc(db, 'diagnoses', docId);
  
  const payload = {
    ...diagnosisData,
    id: docId,
    userId: uid,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `diagnoses/${docId}`);
  }
}

export async function saveStartProjectToFirestore(projectData: any, userId?: string) {
  const uid = userId || auth.currentUser?.uid || (await ensureAuthUser());
  const rawId = projectData.id || `start_${Date.now()}`;
  const docId = sanitizeId(rawId);
  const docRef = doc(db, 'start_projects', docId);

  const payload = {
    ...projectData,
    id: docId,
    userId: uid,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `start_projects/${docId}`);
  }
}

export async function saveDigitalTwinToFirestore(twinData: any, userId?: string) {
  const uid = userId || auth.currentUser?.uid || (await ensureAuthUser());
  const rawId = twinData.id || `twin_${twinData.handle || 'user'}`;
  const docId = sanitizeId(rawId);
  const docRef = doc(db, 'digital_twins', docId);

  const payload = {
    ...twinData,
    id: docId,
    userId: uid,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `digital_twins/${docId}`);
  }
}

