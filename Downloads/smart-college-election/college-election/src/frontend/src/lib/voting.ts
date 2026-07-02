import { CANDIDATES, POSITIONS } from "@/data/electionData";
import type { Vote } from "@/types/election";
import {
  type Transaction,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.js";

const BALLOTS_COLLECTION = "ballots";
const CANDIDATE_TOTALS_COLLECTION = "candidate_totals";
const VOTERS_COLLECTION = "voters";

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

function getValidatedBoothId(boothId: string | undefined) {
  const normalizedBoothId = boothId?.trim();

  if (!normalizedBoothId) {
    throw new Error("Booth ID is missing from the voting URL.");
  }

  return normalizedBoothId;
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

  const voterReference = doc(db, VOTERS_COLLECTION, studentId);
  const ballotReference = doc(db, BALLOTS_COLLECTION, studentId);

  try {
    await runTransaction(db, async (transaction) => {
      const voterSnapshot = await transaction.get(voterReference);

      if (!voterSnapshot.exists()) {
        throw new Error("Invalid Student ID.");
      }

      const voter = voterSnapshot.data() as { hasVoted?: unknown };

      if (voter.hasVoted === true) {
        throw new Error("You have already voted.");
      }

      if (voter.hasVoted !== false) {
        throw new Error(
          "Voting eligibility could not be verified. Contact an administrator.",
        );
      }

      transaction.set(ballotReference, {
        source: "mobile",
        student_id: studentId,
        votes,
        submitted_at: serverTimestamp(),
      });
      transaction.update(voterReference, {
        hasVoted: true,
      });
      applyCandidateVoteIncrements(transaction, votes);
    });

    console.info("[Firestore] Mobile ballot synchronized", {
      ballotId: ballotReference.id,
    });
  } catch (writeError) {
    if (isNetworkRelatedError(writeError)) {
      console.warn("[Firestore] Mobile ballot submission network failure", {
        ballotId: ballotReference.id,
        code: getFirestoreErrorCode(writeError),
        error: writeError,
      });
      throw new Error(
        "Unable to submit your vote right now. Please check your connection and try again.",
      );
    }

    throw writeError;
  }
}

export async function submitBoothBallot(votes: Vote, boothId: string) {
  validateVotes(votes);
  const validatedBoothId = getValidatedBoothId(boothId);

  const ballotReference = doc(collection(db, BALLOTS_COLLECTION));

  await runTransaction(db, async (transaction) => {
    transaction.set(ballotReference, {
      votes,
      boothId: validatedBoothId,
      source: "booth",
      submitted_at: serverTimestamp(),
    });
    applyCandidateVoteIncrements(transaction, votes);
  });
}
