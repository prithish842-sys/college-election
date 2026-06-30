import { getAnalytics } from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

function readRequiredEnv(name) {
  const value = import.meta.env?.[name];
  return typeof value === "string" ? value.trim() : "";
}

const firebaseConfig = {
  apiKey: readRequiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: readRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: readRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readRequiredEnv("VITE_FIREBASE_APP_ID"),
  measurementId: readRequiredEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

const requiredFirebaseConfig = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
};

const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing required Firebase configuration: ${missingFirebaseConfig.join(
      ", ",
    )}. Check the frontend .env file or deployment environment variables.`,
  );
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let analytics = null;

if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (analyticsError) {
    console.warn("[Firebase] Analytics is unavailable in this environment.", {
      error: analyticsError,
    });
  }
}

let db;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  console.info("[Firestore] IndexedDB offline persistence initialized.");
} catch (persistenceError) {
  const code =
    typeof persistenceError === "object" &&
    persistenceError &&
    "code" in persistenceError
      ? String(persistenceError.code)
      : "unknown";

  if (
    code.includes("already-initialized") ||
    code.includes("failed-precondition") ||
    code.includes("unimplemented")
  ) {
    console.warn(
      "[Firestore] Persistent cache is unavailable; using the active Firestore instance.",
      { code },
    );
  } else {
    console.error("[Firestore] Persistent cache initialization failed.", {
      code,
      error: persistenceError,
    });
  }

  db = getFirestore(app);
}

console.info("[Firebase] Initialized project.", {
  projectId: app.options.projectId,
  authDomain: app.options.authDomain,
});

export { analytics, app, auth, db };
