import { CANDIDATES, POSITIONS } from "@/data/electionData";
import { beforeEach, describe, expect, it, vi } from "vitest";

const docMock = vi.fn();
const collectionMock = vi.fn();
const incrementMock = vi.fn((value) => ({ __type: "increment", value }));
const runTransactionMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __type: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
  collection: (...args) => collectionMock(...args),
  doc: (...args) => docMock(...args),
  increment: (...args) => incrementMock(...args),
  runTransaction: (...args) => runTransactionMock(...args),
  serverTimestamp: (...args) => serverTimestampMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  db: { name: "mock-db" },
}));

function createSnapshot({ exists, data }) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

function createValidVotes() {
  return Object.fromEntries(
    POSITIONS.map((position) => {
      const candidate = CANDIDATES.find(
        (entry) => entry.positionId === position.id,
      );

      return [position.id, candidate.id];
    }),
  );
}

describe("voting transaction helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    docMock.mockImplementation((...args) => {
      if (args.length === 1) {
        return { kind: "doc-ref", id: "generated-ballot", parent: args[0] };
      }

      const [, collectionName, documentId] = args;
      return { kind: "doc-ref", collectionName, id: documentId };
    });

    collectionMock.mockImplementation((database, collectionName) => ({
      kind: "collection-ref",
      database,
      collectionName,
    }));
  });

  it("submits a mobile ballot atomically and increments every selected candidate total", async () => {
    const { submitBallot } = await import("../lib/voting");
    const votes = createValidVotes();

    const transaction = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          createSnapshot({
            exists: true,
            data: { has_voted: false },
          }),
        )
        .mockResolvedValueOnce(
          createSnapshot({
            exists: false,
            data: undefined,
          }),
        ),
      set: vi.fn(),
      update: vi.fn(),
    };

    runTransactionMock.mockImplementation(async (_db, callback) =>
      callback(transaction),
    );

    await submitBallot("24BSC001", votes);

    expect(runTransactionMock).toHaveBeenCalledTimes(1);
    expect(transaction.get).toHaveBeenCalledTimes(2);
    expect(transaction.update).toHaveBeenCalledWith(
      { kind: "doc-ref", collectionName: "voters", id: "24BSC001" },
      expect.objectContaining({
        has_voted: true,
        voted_at: { __type: "serverTimestamp" },
      }),
    );
    expect(transaction.set).toHaveBeenCalledWith(
      { kind: "doc-ref", collectionName: "ballots", id: "24BSC001" },
      expect.objectContaining({
        source: "mobile",
        student_id: "24BSC001",
        votes,
        submitted_at: { __type: "serverTimestamp" },
      }),
    );

    const candidateTotalWrites = transaction.set.mock.calls.filter(
      ([reference]) => reference.collectionName === "candidate_totals",
    );

    expect(candidateTotalWrites).toHaveLength(POSITIONS.length);
    expect(incrementMock).toHaveBeenCalledTimes(POSITIONS.length);
    expect(serverTimestampMock).toHaveBeenCalled();
  });

  it("rejects a second mobile ballot when the voter has already voted", async () => {
    const { submitBallot } = await import("../lib/voting");
    const votes = createValidVotes();

    const transaction = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          createSnapshot({
            exists: true,
            data: { has_voted: true },
          }),
        )
        .mockResolvedValueOnce(
          createSnapshot({
            exists: false,
            data: undefined,
          }),
        ),
      set: vi.fn(),
      update: vi.fn(),
    };

    runTransactionMock.mockImplementation(async (_db, callback) =>
      callback(transaction),
    );

    await expect(submitBallot("24BSC001", votes)).rejects.toThrow(
      "This voter has already submitted a ballot.",
    );

    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("submits a booth ballot in a transaction and updates aggregate counters", async () => {
    const { submitBoothBallot } = await import("../lib/voting");
    const votes = createValidVotes();

    const transaction = {
      set: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
    };

    runTransactionMock.mockImplementation(async (_db, callback) =>
      callback(transaction),
    );

    await submitBoothBallot(votes, "booth1");

    expect(collectionMock).toHaveBeenCalledWith({ name: "mock-db" }, "ballots");
    expect(transaction.update).not.toHaveBeenCalled();

    const ballotWrite = transaction.set.mock.calls.find(
      ([reference]) => reference.id === "generated-ballot",
    );

    expect(ballotWrite).toBeTruthy();
    expect(ballotWrite[1]).toEqual(
      expect.objectContaining({
        votes,
        source: "booth",
        submitted_at: { __type: "serverTimestamp" },
      }),
    );

    const candidateTotalWrites = transaction.set.mock.calls.filter(
      ([reference]) => reference.collectionName === "candidate_totals",
    );

    expect(candidateTotalWrites).toHaveLength(POSITIONS.length);
  });

  it("fails fast before opening a transaction when the ballot is incomplete", async () => {
    const { submitBallot } = await import("../lib/voting");
    const [firstPosition] = POSITIONS;
    const invalidVotes = { [firstPosition.id]: "missing-candidate" };

    await expect(submitBallot("24BSC001", invalidVotes)).rejects.toThrow(
      "Please vote for every position before submitting.",
    );

    expect(runTransactionMock).not.toHaveBeenCalled();
  });
});

