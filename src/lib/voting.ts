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

export async function submitBallot(studentId: string, votes: Vote) {
  validateVotes(votes);

  const voterReference = doc(db, VOTERS_COLLECTION, studentId);
  const ballotReference = doc(db, BALLOTS_COLLECTION, studentId);

  await runTransaction(db, async (transaction) => {
    const voterSnapshot = await transaction.get(voterReference);
    const ballotSnapshot = await transaction.get(ballotReference);

    if (!voterSnapshot.exists()) {
      throw new Error("This voter record no longer exists.");
    }

    if (voterSnapshot.data().has_voted === true || ballotSnapshot.exists()) {
      throw new Error("This voter has already submitted a ballot.");
    }

    if (voterSnapshot.data().has_voted !== false) {
      throw new Error("Voting eligibility could not be verified.");
    }

    transaction.set(ballotReference, {
      source: "mobile",
      student_id: studentId,
      votes,
      submitted_at: serverTimestamp(),
    });
    transaction.update(voterReference, {
      has_voted: true,
      voted_at: serverTimestamp(),
    });
    applyCandidateVoteIncrements(transaction, votes);
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
