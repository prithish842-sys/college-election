import { CANDIDATES, POSITIONS } from "@/data/electionData";
import type { Vote } from "@/types/election";
import {
  type Transaction,
  type WriteBatch,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase.js";

const BALLOTS_COLLECTION = "ballots";
const CANDIDATE_TOTALS_COLLECTION = "candidate_totals";
const STUDENTS_COLLECTION = "students";

function validateVotes(votes: Vote) {
  const hasEveryVote = POSITIONS.every((position) => {
    const candidateId = votes[position.id];
    return CANDIDATES.some(
      (candidate) =>
        candidate.id === candidateId && candidate.positionId === position.id,
    );
  });

  if (!hasEveryVote) {
    throw new Error("Please vote for every position before submitting.");
  }
}

function applyCandidateVoteIncrements(transaction: Transaction, votes: Vote) {
  for (const [positionId, candidateId] of Object.entries(votes)) {
    const candidate = CANDIDATES.find(
      (entry) => entry.id === candidateId && entry.positionId === positionId,
    );

    if (!candidate) {
      throw new Error("One or more selected candidates are invalid.");
    }

    transaction.set(
      doc(db, CANDIDATE_TOTALS_COLLECTION, candidate.id),
      {
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        position_id: candidate.positionId,
        votes_count: increment(1),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

function applyCandidateVoteIncrementsToBatch(batch: WriteBatch, votes: Vote) {
  for (const [positionId, candidateId] of Object.entries(votes)) {
    const candidate = CANDIDATES.find(
      (entry) => entry.id === candidateId && entry.positionId === positionId,
    );

    if (!candidate) {
      throw new Error("One or more selected candidates are invalid.");
    }

    batch.set(
      doc(db, CANDIDATE_TOTALS_COLLECTION, candidate.id),
      {
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        position_id: candidate.positionId,
        votes_count: increment(1),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

function getFirestoreErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String(error.code).toLowerCase()
    : "unknown";
}

function isNetworkRelatedError(error: unknown) {
  const code = getFirestoreErrorCode(error);
  return (
    code.includes("unavailable") ||
    code.includes("deadline-exceeded") ||
    code.includes("network-request-failed")
  );
}

export async function submitBallot(studentId: string, votes: Vote) {
  validateVotes(votes);

  const voterReference = doc(db, STUDENTS_COLLECTION, studentId);
  const ballotReference = doc(db, BALLOTS_COLLECTION, studentId);
  const batch = writeBatch(db);

  batch.set(ballotReference, {
    source: "mobile",
    student_id: studentId,
    votes,
    submitted_at: serverTimestamp(),
  });
  batch.update(voterReference, {
    has_voted: true,
    voted_at: serverTimestamp(),
  });
  applyCandidateVoteIncrementsToBatch(batch, votes);

  const commitPromise = batch.commit();

  void commitPromise
    .then(() => {
      console.info("[Firestore] Mobile ballot synchronized", {
        ballotId: ballotReference.id,
      });
    })
    .catch((writeError) => {
      const details = {
        ballotId: ballotReference.id,
        code: getFirestoreErrorCode(writeError),
        error: writeError,
      };

      if (isNetworkRelatedError(writeError)) {
        console.warn("Offline caching active", details);
      } else {
        console.error(
          "[Firestore] Mobile ballot synchronization failed",
          details,
        );
      }
    });
}

export async function submitKioskBallot(votes: Vote) {
  validateVotes(votes);

  const ballotReference = doc(collection(db, BALLOTS_COLLECTION));

  await runTransaction(db, async (transaction) => {
    transaction.set(ballotReference, {
      votes,
      source: "kiosk",
      submitted_at: serverTimestamp(),
    });
    applyCandidateVoteIncrements(transaction, votes);
  });
}
