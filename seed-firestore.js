import { readFile } from "node:fs/promises";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase.js";

// Firebase configuration is loaded from ./firebase.js, which exports the
// initialized Firestore instance. students.json is resolved relative to this
// script, so execution does not depend on the terminal's working directory.
const COLLECTION_NAME = "voters";
const WRITE_BATCH_SIZE = 400;
const RESET_VOTES_FLAG = "--reset-votes";
const DRY_RUN_FLAG = "--dry-run";

const shouldResetVotes = process.argv.includes(RESET_VOTES_FLAG);
const isDryRun = process.argv.includes(DRY_RUN_FLAG);
const studentsFile = new URL("./students.json", import.meta.url);

function validateStudent(student, index) {
  if (!student || typeof student !== "object" || Array.isArray(student)) {
    throw new Error(`Student at index ${index} must be an object.`);
  }

  const studentId =
    typeof student.student_id === "string" ? student.student_id.trim() : "";

  if (!studentId) {
    throw new Error(`Student at index ${index} has no valid student_id.`);
  }

  if (studentId.includes("/")) {
    throw new Error(
      `Student ID "${studentId}" contains "/", which cannot be used as a document ID.`,
    );
  }

  if (typeof student.has_voted !== "boolean") {
    throw new Error(
      `Student "${studentId}" must have a boolean has_voted field.`,
    );
  }

  return {
    student_id: studentId,
    name: typeof student.name === "string" ? student.name.trim() : "",
    department:
      typeof student.department === "string" ? student.department.trim() : "",
    phone_number:
      typeof student.phone_number === "string"
        ? student.phone_number.trim()
        : "",
    has_voted: student.has_voted,
  };
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function loadUniqueStudents() {
  const fileContents = await readFile(studentsFile, "utf8");
  const parsedStudents = JSON.parse(fileContents);

  if (!Array.isArray(parsedStudents)) {
    throw new Error("students.json must contain a JSON array.");
  }

  const uniqueStudents = new Map();
  const duplicateIds = new Set();

  parsedStudents.forEach((student, index) => {
    const validatedStudent = validateStudent(student, index);

    if (uniqueStudents.has(validatedStudent.student_id)) {
      duplicateIds.add(validatedStudent.student_id);
      return;
    }

    uniqueStudents.set(validatedStudent.student_id, validatedStudent);
  });

  if (duplicateIds.size > 0) {
    const preview = [...duplicateIds].slice(0, 10).join(", ");
    console.warn(
      `Found ${duplicateIds.size} duplicate student IDs. The first record for each ID will be used.`,
    );
    console.warn(
      `Duplicate preview: ${preview}${duplicateIds.size > 10 ? ", ..." : ""}`,
    );
  }

  console.log(
    `Loaded ${parsedStudents.length} rows and ${uniqueStudents.size} unique voters.`,
  );

  return [...uniqueStudents.values()];
}

async function findExistingVoterIds() {
  const existingIds = new Set();
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));

  for (const voterDocument of snapshot.docs) {
    existingIds.add(voterDocument.id);
  }

  return existingIds;
}

async function seedFirestore() {
  const students = await loadUniqueStudents();

  if (isDryRun) {
    console.log(
      `Dry run complete. ${students.length} voter documents are valid; Firestore was not changed.`,
    );
    return;
  }

  const existingVoterIds = await findExistingVoterIds();
  const studentChunks = chunk(students, WRITE_BATCH_SIZE);
  let completedWrites = 0;

  for (const studentsToWrite of studentChunks) {
    const batch = writeBatch(db);

    for (const student of studentsToWrite) {
      const { has_voted: hasVoted, ...identityFields } = student;
      const isExistingVoter = existingVoterIds.has(student.student_id);
      const voterData =
        isExistingVoter && !shouldResetVotes
          ? identityFields
          : { ...identityFields, has_voted: hasVoted };

      batch.set(doc(db, COLLECTION_NAME, student.student_id), voterData, {
        merge: true,
      });
    }

    await batch.commit();
    completedWrites += studentsToWrite.length;
    console.log(`Seeded ${completedWrites}/${students.length} voters.`);
  }

  console.log(
    `Firestore seed complete: ${students.length} documents in "${COLLECTION_NAME}".`,
  );

  if (!shouldResetVotes && existingVoterIds.size > 0) {
    console.log(
      `Preserved has_voted for ${existingVoterIds.size} existing voters.`,
    );
  }
}

seedFirestore().catch((error) => {
  console.error("Firestore seed failed:");
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "Confirm that your Firebase configuration is correct and your Firestore rules allow these writes.",
  );
  process.exitCode = 1;
});
