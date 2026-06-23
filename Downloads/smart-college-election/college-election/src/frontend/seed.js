import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const environmentPath = resolve(projectRoot, ".env");
const seedEnvironmentPath = resolve(projectRoot, ".env.seed");
const studentsPath = resolve(projectRoot, "students.json");

const environmentResult = dotenv.config({ path: environmentPath });

if (environmentResult.error) {
  throw new Error(`Unable to load environment file: ${environmentPath}`, {
    cause: environmentResult.error,
  });
}

const seedEnvironmentResult = dotenv.config({ path: seedEnvironmentPath });

if (seedEnvironmentResult.error) {
  throw new Error(
    `Unable to load seed environment file: ${seedEnvironmentPath}`,
    { cause: seedEnvironmentResult.error },
  );
}

function requireEnvironmentVariable(variableName) {
  const rawValue = process.env[variableName];

  if (!rawValue?.trim()) {
    throw new Error(
      `Missing environment variable ${variableName} in ${environmentPath}.`,
    );
  }

  const value = rawValue.trim();

  if (value.endsWith(",")) {
    throw new Error(
      `${variableName} ends with a comma. Remove the trailing comma from .env.`,
    );
  }

  if (
    value.startsWith('"') ||
    value.endsWith('"') ||
    value.startsWith("'") ||
    value.endsWith("'")
  ) {
    throw new Error(
      `${variableName} contains unmatched quote characters. Correct its .env formatting.`,
    );
  }

  return value;
}

function loadFirebaseConfiguration() {
  const firebaseConfig = {
    apiKey: requireEnvironmentVariable("VITE_FIREBASE_API_KEY"),
    authDomain: requireEnvironmentVariable("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnvironmentVariable("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: requireEnvironmentVariable("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requireEnvironmentVariable(
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
    ),
    appId: requireEnvironmentVariable("VITE_FIREBASE_APP_ID"),
  };

  if (!/^AIza[\w-]{20,}$/.test(firebaseConfig.apiKey)) {
    throw new Error(
      "VITE_FIREBASE_API_KEY does not have a valid Firebase web API key format.",
    );
  }

  if (!/^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]$/.test(firebaseConfig.projectId)) {
    throw new Error(
      "VITE_FIREBASE_PROJECT_ID does not have a valid Firebase project ID format.",
    );
  }

  return firebaseConfig;
}

async function loadServiceAccount(expectedProjectId) {
  const credentialVariableName =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()
      ? "FIREBASE_SERVICE_ACCOUNT_PATH"
      : process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
        ? "GOOGLE_APPLICATION_CREDENTIALS"
        : null;

  if (!credentialVariableName) {
    throw new Error(
      "Missing Admin credential path. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  const configuredPath = requireEnvironmentVariable(credentialVariableName);
  const serviceAccountPath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(projectRoot, configuredPath);

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Unable to read the Firebase service account JSON at ${serviceAccountPath}.`,
      { cause: error },
    );
  }

  const requiredFields = ["project_id", "client_email", "private_key"];
  const missingFields = requiredFields.filter(
    (fieldName) => !serviceAccount[fieldName],
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Service account JSON is missing: ${missingFields.join(", ")}.`,
    );
  }

  if (serviceAccount.project_id !== expectedProjectId) {
    throw new Error(
      `Project mismatch: .env targets "${expectedProjectId}", but the service account targets "${serviceAccount.project_id}".`,
    );
  }

  return {
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    projectId: serviceAccount.project_id,
  };
}

async function loadAndValidateStudents() {
  let students;

  try {
    students = JSON.parse(await readFile(studentsPath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to parse ${studentsPath} as JSON.`, {
      cause: error,
    });
  }

  if (!Array.isArray(students)) {
    throw new TypeError("students.json must contain a JSON array.");
  }

  const seenStudentIds = new Set();

  for (const [index, student] of students.entries()) {
    if (!student || typeof student !== "object" || Array.isArray(student)) {
      throw new TypeError(`Student at index ${index} must be an object.`);
    }

    if (
      typeof student.studentId !== "string" ||
      student.studentId.trim() === ""
    ) {
      throw new TypeError(
        `Student at index ${index} must have a non-empty string studentId.`,
      );
    }

    if (student.studentId.includes("/")) {
      throw new Error(
        `Student ID "${student.studentId}" at index ${index} cannot contain "/".`,
      );
    }

    if (seenStudentIds.has(student.studentId)) {
      throw new Error(
        `Duplicate studentId "${student.studentId}" found at index ${index}.`,
      );
    }

    seenStudentIds.add(student.studentId);
  }

  return students;
}

function logSeedError(error) {
  console.error("Firestore seed failed.");
  console.error(error instanceof Error ? error.message : error);

  if (error instanceof Error && error.cause) {
    console.error("Cause:", error.cause);
  }

  const errorCode = error?.code;

  if (errorCode === 7 || errorCode === "permission-denied") {
    console.error(
      "The service account lacks Firestore IAM permission for this project.",
    );
  } else if (errorCode === "app/invalid-credential") {
    console.error("The Firebase service account credential is invalid.");
  }
}

async function seedDatabase() {
  let firebaseApp;

  try {
    console.log(
      `Loading environment variables from ${environmentPath} and ${seedEnvironmentPath}...`,
    );
    const firebaseConfig = loadFirebaseConfiguration();
    const students = await loadAndValidateStudents();

    console.log(`Validated ${students.length} student record(s).`);

    if (students.length === 0) {
      console.log("students.json is empty. No Firestore writes are required.");
      return;
    }

    const serviceAccount = await loadServiceAccount(firebaseConfig.projectId);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });

    const db = getFirestore(firebaseApp);
    console.log(`Writing to Firebase project "${firebaseConfig.projectId}"...`);

    for (const [index, student] of students.entries()) {
      await db.collection("students").doc(student.studentId).set(student);
      console.log(
        `Uploaded ${index + 1}/${students.length}: ${student.studentId}`,
      );
    }

    console.log(
      `Firestore seed completed successfully: ${students.length} document(s) written.`,
    );
  } catch (error) {
    logSeedError(error);
    process.exitCode = 1;
  } finally {
    if (firebaseApp) {
      await deleteApp(firebaseApp);
    }
  }
}

await seedDatabase();
