import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnvironment } from "dotenv";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const STUDENTS_FILE_NAME = "new_students.json";
const STUDENTS_FILE_PATH = resolve(SCRIPT_DIRECTORY, STUDENTS_FILE_NAME);
const COLLECTION_NAME = "voters";
const FIRESTORE_BATCH_LIMIT = 500;

const ENVIRONMENT_FILES = [
  resolve(SCRIPT_DIRECTORY, ".env.local"),
  resolve(SCRIPT_DIRECTORY, ".env"),
  resolve(SCRIPT_DIRECTORY, "src", "frontend", ".env.local"),
  resolve(SCRIPT_DIRECTORY, "src", "frontend", ".env"),
];

const REQUIRED_FIREBASE_ENV = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

function loadEnvironmentFiles() {
  const loadedFiles = [];

  for (const environmentPath of ENVIRONMENT_FILES) {
    if (!existsSync(environmentPath)) {
      continue;
    }

    const result = loadEnvironment({
      path: environmentPath,
      override: false,
      quiet: true,
    });

    if (result.error) {
      throw new Error(`Unable to load Firebase environment file: ${environmentPath}`, {
        cause: result.error,
      });
    }

    loadedFiles.push(environmentPath);
  }

  return loadedFiles;
}

function readRequiredEnvironment(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function buildFirebaseConfig() {
  const missingEnvironment = REQUIRED_FIREBASE_ENV.filter(
    (name) => !readRequiredEnvironment(name),
  );

  if (missingEnvironment.length > 0) {
    throw new Error(
      `Missing required Firebase Client SDK environment variables: ${missingEnvironment.join(
        ", ",
      )}. Add them to .env.local, .env, src/frontend/.env.local, or src/frontend/.env.`,
    );
  }

  return {
    apiKey: readRequiredEnvironment("VITE_FIREBASE_API_KEY"),
    authDomain: readRequiredEnvironment("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: readRequiredEnvironment("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: readRequiredEnvironment("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readRequiredEnvironment("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readRequiredEnvironment("VITE_FIREBASE_APP_ID"),
    measurementId: readRequiredEnvironment("VITE_FIREBASE_MEASUREMENT_ID"),
  };
}

function normalizeStudent(student, index) {
  if (!student || typeof student !== "object" || Array.isArray(student)) {
    throw new TypeError(`Student at index ${index} must be an object.`);
  }

  if (typeof student.studentId !== "string" && typeof student.studentId !== "number") {
    throw new TypeError(`Student at index ${index} must include a studentId.`);
  }

  const studentId = String(student.studentId).trim();

  if (!studentId) {
    throw new TypeError(`Student at index ${index} must include a non-empty studentId.`);
  }

  if (studentId.includes("/")) {
    throw new Error(`Student ID "${studentId}" cannot contain a forward slash.`);
  }

  return {
    ...student,
    studentId,
    hasVoted: false,
  };
}

async function readStudents() {
  if (!existsSync(STUDENTS_FILE_PATH)) {
    throw new Error(`Missing ${STUDENTS_FILE_NAME} at ${STUDENTS_FILE_PATH}.`);
  }

  const fileContents = await readFile(STUDENTS_FILE_PATH, "utf8");
  const students = JSON.parse(fileContents);

  if (!Array.isArray(students)) {
    throw new TypeError(`${STUDENTS_FILE_NAME} must contain a JSON array.`);
  }

  return students.map((student, index) => normalizeStudent(student, index));
}

async function seedStudents(db, students, firestore) {
  if (students.length === 1) {
    const [student] = students;
    const studentReference = firestore.doc(db, COLLECTION_NAME, student.studentId);

    await firestore.setDoc(studentReference, student);
    console.log("Committed 1/1 voter records.");
    return 1;
  }

  let uploadedCount = 0;

  for (let start = 0; start < students.length; start += FIRESTORE_BATCH_LIMIT) {
    const batch = firestore.writeBatch(db);
    const chunk = students.slice(start, start + FIRESTORE_BATCH_LIMIT);

    for (const student of chunk) {
      const studentReference = firestore.doc(db, COLLECTION_NAME, student.studentId);
      batch.set(studentReference, student);
    }

    await batch.commit();
    uploadedCount += chunk.length;
    console.log(`Committed ${uploadedCount}/${students.length} voter records.`);
  }

  return uploadedCount;
}

let db;
let terminateFirestore;

try {
  const loadedEnvironmentFiles = loadEnvironmentFiles();
  const firebaseConfig = buildFirebaseConfig();
  const [{ initializeApp }, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore"),
  ]);
  const firebaseApp = initializeApp(firebaseConfig);
  db = firestore.getFirestore(firebaseApp);
  terminateFirestore = firestore.terminate;

  console.log(
    loadedEnvironmentFiles.length > 0
      ? `Loaded Firebase environment from: ${loadedEnvironmentFiles.join(", ")}`
      : "Using Firebase environment variables from the current shell.",
  );
  console.log(`Reading student data from ${STUDENTS_FILE_PATH}`);

  const students = await readStudents();

  if (students.length === 0) {
    console.log(`${STUDENTS_FILE_NAME} is empty. No voter records were written.`);
  } else {
    const uploadedCount = await seedStudents(db, students, firestore);
    console.log(
      `Firestore seed completed successfully: ${uploadedCount} voter records written to "${COLLECTION_NAME}".`,
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Firestore seed failed: ${message}`);
  process.exitCode = 1;
} finally {
  if (db && terminateFirestore) {
    await terminateFirestore(db);
  }
}
