import { getAnalytics } from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
};

const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing required Firebase configuration: ${missingFirebaseConfig.join(", ")}. Check the VITE_FIREBASE_* environment variables.`,
  );
}

// Reuse the default app during Vite hot reloads instead of creating duplicates.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

let db;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  console.info("[Firestore] IndexedDB offline persistence initialized");
} catch (persistenceError) {
  const code =
    typeof persistenceError === "object" &&
    persistenceError &&
    "code" in persistenceError
      ? String(persistenceError.code)
      : "unknown";

  if (code.includes("failed-precondition") || code.includes("unimplemented")) {
    console.warn(
      "[Firestore] Persistent cache is unavailable; continuing with the existing Firestore cache.",
      { code },
    );
  } else {
    console.error("[Firestore] Persistent cache initialization failed", {
      code,
      error: persistenceError,
    });
  }

  db = getFirestore(app);
}

console.log("Firebase SDK Initialized:", !!auth);
console.info("[Firebase] Active authentication project", {
  projectId: app.options.projectId,
  authDomain: app.options.authDomain,
});

export { analytics, app, auth, db };
