import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KioskVotingDashboard } from "../components/KioskVotingDashboard";
import { CANDIDATES, POSITIONS } from "../data/electionData";
import { submitBallot } from "../lib/voting";

const {
  batchCommitMock,
  batchSetMock,
  batchUpdateMock,
  collectionMock,
  docMock,
  incrementMock,
  serverTimestampMock,
  writeBatchMock,
} = vi.hoisted(() => ({
  batchCommitMock: vi.fn(),
  batchSetMock: vi.fn(),
  batchUpdateMock: vi.fn(),
  collectionMock: vi.fn((_db, collectionName) => ({ collectionName })),
  docMock: vi.fn((...segments) => {
    if (segments.length === 1 && segments[0]?.collectionName) {
      return {
        collectionName: segments[0].collectionName,
        id: "generated-ballot-id",
      };
    }

    return {
      collectionName: segments[1],
      id: segments[2],
      path: segments.slice(1).join("/"),
    };
  }),
  incrementMock: vi.fn((value) => ({ __op: "increment", value })),
  serverTimestampMock: vi.fn(() => ({ __op: "serverTimestamp" })),
  writeBatchMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: (...args) => collectionMock(...args),
  doc: (...args) => docMock(...args),
  increment: (...args) => incrementMock(...args),
  onSnapshot: vi.fn(),
  serverTimestamp: (...args) => serverTimestampMock(...args),
  writeBatch: (...args) => writeBatchMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  db: { app: "mock-firestore" },
}));

function createValidVotes() {
  return POSITIONS.reduce((votes, position) => {
    const candidate = CANDIDATES.find(
      (entry) => entry.positionId === position.id,
    );

    if (candidate) {
      votes[position.id] = candidate.id;
    }

    return votes;
  }, {});
}

function getFirstCandidateForPosition(positionId) {
  const candidate = CANDIDATES.find((entry) => entry.positionId === positionId);

  if (!candidate) {
    throw new Error(`Missing candidate fixture for ${positionId}`);
  }

  return candidate;
}

async function completeMobileBallot() {
  for (const position of POSITIONS) {
    const candidate = getFirstCandidateForPosition(position.id);

    expect(
      await screen.findByRole("heading", {
        name: new RegExp(`vote for ${position.title}`, "i"),
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`select ${candidate.name}`, "i"),
      }),
    );
  }
}

describe("voting submission", () => {
  beforeEach(() => {
    batchCommitMock.mockReset();
    batchSetMock.mockReset();
    batchUpdateMock.mockReset();
    collectionMock.mockClear();
    docMock.mockClear();
    incrementMock.mockClear();
    serverTimestampMock.mockClear();
    writeBatchMock.mockReset();

    batchCommitMock.mockResolvedValue(undefined);
    writeBatchMock.mockReturnValue({
      commit: batchCommitMock,
      set: batchSetMock,
      update: batchUpdateMock,
    });
  });

  it("renders optimistic success when Firestore reports an offline network failure", async () => {
    batchCommitMock.mockRejectedValueOnce({ code: "unavailable" });

    render(
      <KioskVotingDashboard
        mode="mobile"
        studentId="24BSC002"
        onSessionComplete={vi.fn()}
      />,
    );

    await completeMobileBallot();
    fireEvent.click(screen.getByRole("button", { name: /submit vote/i }));

    expect(
      await screen.findByRole("heading", {
        name: /vote submitted successfully/i,
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/connection error/i)).toBeNull();
    expect(screen.queryByText(/unable to submit/i)).toBeNull();
    expect(screen.queryByText(/submitting/i)).toBeNull();
  }, 15_000);

  it("uses atomic increment operations for every selected candidate total", async () => {
    const votes = createValidVotes();

    await submitBallot("24BSC001", votes);

    expect(incrementMock).toHaveBeenCalledTimes(Object.keys(votes).length);
    for (const candidateId of Object.values(votes)) {
      expect(batchSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: "candidate_totals",
          id: candidateId,
        }),
        expect.objectContaining({
          candidate_id: candidateId,
          votes_count: { __op: "increment", value: 1 },
        }),
        { merge: true },
      );
    }
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("locks the voter document with has_voted true in the same batch", async () => {
    const votes = createValidVotes();

    await submitBallot("24BSC001", votes);

    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "students",
        id: "24BSC001",
      }),
      expect.objectContaining({
        has_voted: true,
        voted_at: { __op: "serverTimestamp" },
      }),
    );
    expect(batchSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "ballots",
        id: "24BSC001",
      }),
      expect.objectContaining({
        source: "mobile",
        student_id: "24BSC001",
        votes,
      }),
    );
    expect(batchCommitMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(batchCommitMock).toHaveBeenCalled();
    });
  });
});
