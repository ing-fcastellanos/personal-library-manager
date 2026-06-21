import {
  getApps,
  getApp,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";
import {
  firebaseClientConfig,
  assertClientConfig,
  useClientEmulator,
} from "./config";

/**
 * Browser-side Firebase Client SDK access. Used only for the direct-client cases
 * permitted by ADR-0009 (Storage uploads, read-only dashboard listeners).
 *
 * Lazily initialized as a singleton; wires the emulators in development.
 */
let cachedApp: FirebaseApp | undefined;

export function getClientApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  assertClientConfig();
  cachedApp = initializeApp(firebaseClientConfig as FirebaseOptions);

  if (useClientEmulator) {
    connectFirestoreEmulator(getFirestore(cachedApp), "127.0.0.1", 8080);
    connectAuthEmulator(getAuth(cachedApp), "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectStorageEmulator(getStorage(cachedApp), "127.0.0.1", 9199);
  }

  return cachedApp;
}

export function getClientFirestore(): Firestore {
  return getFirestore(getClientApp());
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

export function getClientStorage(): FirebaseStorage {
  return getStorage(getClientApp());
}
