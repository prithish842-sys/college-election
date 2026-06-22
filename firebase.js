import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJ6NMl1jYekyoa2CkdI3Tgn1A50w6aOAI",
  authDomain: "college-election-b7591.firebaseapp.com",
  projectId: "college-election-b7591",
  storageBucket: "college-election-b7591.firebasestorage.app",
  messagingSenderId: "401715035257",
  appId: "1:401715035257:web:e1b9f8385a0c25a308e8a8",
  measurementId: "G-YXMRQ7LMZJ",
};

// Reuse the initialized app during Vite hot reloads.
export const app =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
