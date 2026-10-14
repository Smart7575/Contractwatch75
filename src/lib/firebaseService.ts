import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  deleteUser,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';
import { Category, Contract, User, UserSettings } from '../types';
import { generateDemoContracts, DEFAULT_USER, isDemoContract } from './storage';

export interface AuthActionResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}

/**
 * Format Firebase Auth error codes into clear human-friendly messages
 */
export function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address. Please check your entry.';
    case 'auth/weak-password':
      return 'The password is too weak (minimum 6 characters).';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email address or password. Please verify your credentials.';
    case 'auth/popup-closed-by-user':
      return 'The sign-in window was closed before completion.';
    case 'auth/popup-blocked':
      return 'The popup was blocked by your browser. Please allow popups.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in the Firebase Console.';
    case 'auth/requires-recent-login':
      return 'This action requires you to have signed in recently.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    default:
      return error?.message || 'An unknown error occurred while signing in.';
  }
}

/**
 * User Profile Firestore Helpers
 */
export async function syncUserProfile(
  fbUser: FirebaseUser,
  provider: 'email' | 'google' | 'apple',
  displayName?: string
): Promise<User> {
  const userRef = doc(db, 'users', fbUser.uid);
  const fallbackUser: User = {
    id: fbUser.uid,
    email: fbUser.email || '',
    name: displayName || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Stefan Martinali'),
    provider,
    settings: DEFAULT_USER.settings,
    createdAt: new Date().toISOString(),
  };

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const rawName = (data.name || '').trim();
      const isLegacyDummyName =
        !rawName ||
        rawName.toLowerCase().includes('jordan') ||
        rawName.toLowerCase().includes('hayes');

      const resolvedName = isLegacyDummyName
        ? (fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Stefan Martinali'))
        : (data.name || fbUser.displayName || displayName || fallbackUser.name);

      const userSettings = data.settings || {};
      const isLegacyDummyCurrency = userSettings.currency === 'USD' && isLegacyDummyName;
      const isLegacyDummyTimezone = userSettings.timezone === 'America/New_York' && isLegacyDummyName;

      const resolvedSettings: UserSettings = {
        ...DEFAULT_USER.settings,
        ...userSettings,
        channels: {
          ...DEFAULT_USER.settings.channels,
          ...(userSettings.channels || {}),
        },
        currency: isLegacyDummyCurrency ? 'EUR' : (userSettings.currency || DEFAULT_USER.settings.currency),
        timezone: isLegacyDummyTimezone ? 'Europe/Amsterdam' : (userSettings.timezone || DEFAULT_USER.settings.timezone),
      };

      const resolvedUser: User = {
        id: fbUser.uid,
        email: fbUser.email || data.email || fallbackUser.email,
        name: resolvedName,
        provider: data.provider || provider,
        settings: resolvedSettings,
        createdAt: data.createdAt || fallbackUser.createdAt,
      };

      // If legacy dummy data was detected in Firestore, overwrite it in the cloud database immediately
      if (isLegacyDummyName || isLegacyDummyCurrency || isLegacyDummyTimezone) {
        setDoc(
          userRef,
          cleanForFirestore({
            name: resolvedName,
            settings: resolvedSettings,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        ).catch((err) => {
          console.warn('Could not auto-update legacy profile in Firestore:', err);
        });
      }

      return resolvedUser;
    }

    // If doc does not exist, write the initial profile
    await setDoc(userRef, {
      id: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name,
      provider: fallbackUser.provider,
      settings: fallbackUser.settings,
      createdAt: fallbackUser.createdAt,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return fallbackUser;
  } catch (error: any) {
    console.warn('User profile sync notice (offline or connecting):', error?.message || error);
    // Non-blocking background persistence so offline usage works seamlessly
    setDoc(userRef, {
      id: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name,
      provider: fallbackUser.provider,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
    return fallbackUser;
  }
}

/**
 * Update user profile (name, settings) in Firestore
 */
export async function updateFirestoreUserProfile(
  userId: string,
  updates: { name?: string; email?: string; settings?: Partial<UserSettings> }
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    const current = snap.exists() ? snap.data() : {};
    const payload: any = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) {
      payload.name = updates.name.trim();
    }
    if (updates.email !== undefined) {
      payload.email = updates.email.trim();
    }
    if (updates.settings !== undefined) {
      payload.settings = {
        ...(current.settings || DEFAULT_USER.settings),
        ...updates.settings,
      };
    }
    await setDoc(userRef, cleanForFirestore(payload), { merge: true });
  } catch (error) {
    console.warn('Could not update user profile in Firestore:', error);
  }
}

/**
 * Recursively remove all `undefined` values and ensure data is valid for Firestore
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as any;
  }
  return data;
}

/**
 * Update user settings in Firestore
 */
export async function updateFirestoreUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data();
      const currentSettings = current.settings || DEFAULT_USER.settings;
      await setDoc(
        userRef,
        cleanForFirestore({
          settings: {
            ...currentSettings,
            ...settings,
            channels: {
              ...(currentSettings.channels || DEFAULT_USER.settings.channels),
              ...(settings.channels || {}),
            },
          },
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('Could not update user settings in Firestore:', error);
  }
}

/**
 * Contracts Firestore CRUD
 */
export async function fetchUserContractsFromFirestore(userId: string): Promise<Contract[]> {
  const contractsPath = `users/${userId}/contracts`;
  try {
    const contractsRef = collection(db, 'users', userId, 'contracts');
    const querySnapshot = await getDocs(contractsRef);
    const contracts: Contract[] = [];
    querySnapshot.forEach((docSnap) => {
      contracts.push(docSnap.data() as Contract);
    });
    return contracts;
  } catch (error) {
    console.warn('Could not fetch contracts from Firestore:', error);
    return [];
  }
}

export async function saveContractToFirestore(userId: string, contract: Contract): Promise<void> {
  const contractPath = `users/${userId}/contracts/${contract.id}`;
  try {
    const contractRef = doc(db, 'users', userId, 'contracts', contract.id);
    const cleaned = cleanForFirestore({
      ...contract,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(contractRef, cleaned, { merge: true });
  } catch (error) {
    console.error('Could not save contract to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, contractPath);
  }
}

export async function syncAllContractsToFirestore(
  userId: string,
  localContracts: Contract[]
): Promise<{ contracts: Contract[]; count: number }> {
  const contractsPath = `users/${userId}/contracts`;
  try {
    const contractsRef = collection(db, 'users', userId, 'contracts');
    const snap = await getDocs(contractsRef);
    const remoteContractsMap = new Map<string, Contract>();
    snap.forEach((d) => {
      remoteContractsMap.set(d.id, d.data() as Contract);
    });

    const batch = writeBatch(db);
    let count = 0;

    localContracts.forEach((contract) => {
      const cRef = doc(db, 'users', userId, 'contracts', contract.id);
      const cleaned = cleanForFirestore({
        ...contract,
        userId,
        updatedAt: contract.updatedAt || new Date().toISOString(),
      });
      batch.set(cRef, cleaned, { merge: true });
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }

    // Merge any remote contracts not in local list
    const mergedList = [...localContracts];
    remoteContractsMap.forEach((remoteC, id) => {
      if (!mergedList.some((c) => c.id === id)) {
        mergedList.push(remoteC);
      }
    });

    return { contracts: mergedList, count };
  } catch (error) {
    console.error('Failed to sync all contracts to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, contractsPath);
  }
}

export async function deleteContractFromFirestore(userId: string, contractId: string): Promise<void> {
  const contractPath = `users/${userId}/contracts/${contractId}`;
  try {
    const contractRef = doc(db, 'users', userId, 'contracts', contractId);
    await deleteDoc(contractRef);
  } catch (error) {
    console.error('Could not delete contract from Firestore:', error);
    handleFirestoreError(error, OperationType.DELETE, contractPath);
  }
}

/**
 * Categories Firestore CRUD
 */
export async function fetchUserCategoriesFromFirestore(userId: string): Promise<Category[]> {
  try {
    const catsRef = collection(db, 'users', userId, 'categories');
    const querySnapshot = await getDocs(catsRef);
    const categories: Category[] = [];
    querySnapshot.forEach((docSnap) => {
      categories.push(docSnap.data() as Category);
    });
    return categories;
  } catch (error) {
    console.warn('Could not fetch categories from Firestore:', error);
    return [];
  }
}

export async function saveCategoryToFirestore(userId: string, category: Category): Promise<void> {
  const catPath = `users/${userId}/categories/${category.id}`;
  try {
    const catRef = doc(db, 'users', userId, 'categories', category.id);
    const cleaned = cleanForFirestore({
      ...category,
      userId,
    });
    await setDoc(catRef, cleaned, { merge: true });
  } catch (error) {
    console.error('Could not save category to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, catPath);
  }
}

export async function deleteCategoryFromFirestore(userId: string, categoryId: string): Promise<void> {
  const catPath = `users/${userId}/categories/${categoryId}`;
  try {
    const catRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(catRef);
  } catch (error) {
    console.error('Could not delete category from Firestore:', error);
    handleFirestoreError(error, OperationType.DELETE, catPath);
  }
}

/**
 * Seed initial demo contracts into Firestore for a new user
 */
export async function seedDemoContractsInFirestore(userId: string): Promise<Contract[]> {
  const contractsPath = `users/${userId}/contracts`;
  const demoList = generateDemoContracts(userId).map((c) => ({
    ...c,
    userId,
    isDemo: true,
  }));

  try {
    const batch = writeBatch(db);
    demoList.forEach((c) => {
      const cRef = doc(db, 'users', userId, 'contracts', c.id);
      batch.set(cRef, cleanForFirestore(c), { merge: true });
    });

    await batch.commit();
    return demoList;
  } catch (error) {
    console.warn('Notice seeding demo contracts to Firestore (offline or pending sync):', error);
    return demoList;
  }
}

/**
 * Remove all demo contracts from Firestore for a user
 */
export async function removeDemoContractsFromFirestore(userId: string): Promise<number> {
  const contractsPath = `users/${userId}/contracts`;
  try {
    const contractsRef = collection(db, 'users', userId, 'contracts');
    const querySnapshot = await getDocs(contractsRef);
    const batch = writeBatch(db);
    let count = 0;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<Contract>;
      const isDemo = isDemoContract({ id: docSnap.id, ...data });

      if (isDemo) {
        batch.delete(docSnap.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    console.warn('Could not remove demo contracts from Firestore:', error);
    return 0;
  }
}

/**
 * Delete all user data in Firestore and remove Firebase Auth account
 */
export async function deleteUserAccountCompletely(userId: string): Promise<void> {
  // 1. Delete all user contracts
  try {
    const contractsRef = collection(db, 'users', userId, 'contracts');
    const querySnapshot = await getDocs(contractsRef);
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    // 2. Delete user profile doc
    batch.delete(doc(db, 'users', userId));
    await batch.commit();
  } catch (error) {
    console.warn('Firestore cleanup during account deletion encountered error:', error);
  }

  // 3. Delete Firebase Auth user
  const currentUser = auth.currentUser;
  if (currentUser) {
    await deleteUser(currentUser);
  }
}

/**
 * Authentication Methods
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<AuthActionResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    await syncUserProfile(userCredential.user, 'email', displayName);
    return { success: true, user: userCredential.user };
  } catch (err: any) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<AuthActionResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await syncUserProfile(userCredential.user, 'email');
    return { success: true, user: userCredential.user };
  } catch (err: any) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function loginWithGoogle(): Promise<AuthActionResult> {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(userCredential.user, 'google');
    return { success: true, user: userCredential.user };
  } catch (err: any) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function loginWithApple(): Promise<AuthActionResult> {
  try {
    const userCredential = await signInWithPopup(auth, appleProvider);
    await syncUserProfile(userCredential.user, 'apple');
    return { success: true, user: userCredential.user };
  } catch (err: any) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function resetPassword(email: string): Promise<AuthActionResult> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
