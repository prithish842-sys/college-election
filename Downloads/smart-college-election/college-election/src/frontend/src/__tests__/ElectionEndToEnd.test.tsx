import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobilePortal } from "../components/MobilePortal";
import { ResultsDashboard } from "../components/ResultsDashboard";
import { CANDIDATES, POSITIONS } from "../data/electionData";

const {
  batchCommitMock,
  batchSetMock,
  batchUpdateMock,
  collectionMock,
  docMock,
  getDocMock,
  incrementMock,
  onSnapshotMock,
  serverTimestampMock,
  unsubscribeMock,
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
        id: "generated-document-id",
      };
    }

    return {
      collectionName: segments[1],
      id: segments[2],
      path: segments.slice(1).join("/"),
    };
  }),
  getDocMock: vi.fn(),
  incrementMock: vi.fn((value) => ({ __op: "increment", value })),
  onSnapshotMock: vi.fn(),
  serverTimestampMock: vi.fn(() => ({ __op: "serverTimestamp" })),
  unsubscribeMock: vi.fn(),
  writeBatchMock: vi.fn(),
}));

let adminSnapshotHandler: ((snapshot: unknown) => void) | undefined;
let adminSnapshotErrorHandler: ((error: unknown) => void) | undefined;

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  increment: (...args: unknown[]) => incrementMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  serverTimestamp: (...args: unknown[]) => serverTimestampMock(...args),
  writeBatch: (...args: unknown[]) => writeBatchMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  db: { app: "mock-firestore" },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../components/HomePage", () => ({
  HomePage: ({ onStartVoting }: { onStartVoting: () => void }) => (
    <button type="button" onClick={onStartVoting}>
      Enter Portal
    </button>
  ),
}));

vi.mock("../components/LogoMark", () => ({
  LogoMark: () => <div data-testid="logo-mark" />,
}));

function createStudentSnapshot({
  exists,
  data,
}: {
  exists: boolean;
  data?: Record<string, unknown>;
}) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

function createBallotSnapshot(votesList: Array<Record<string, string>>) {
  return {
    docs: votesList.map((votes, index) => ({
      id: `ballot-${index + 1}`,
      data: () => ({ votes }),
    })),
  };
}

function getFirstCandidateForPosition(positionId: string) {
  const candidate = CANDIDATES.find((entry) => entry.positionId === positionId);

  if (!candidate) {
    throw new Error(`Missing candidate fixture for ${positionId}`);
  }

  return candidate;
}

function createCompleteBallot(overrides: Record<string, string> = {}) {
  return POSITIONS.reduce<Record<string, string>>((votes, position) => {
    votes[position.id] =
      overrides[position.id] ?? getFirstCandidateForPosition(position.id).id;
    return votes;
  }, {});
}

async function openMobileLogin() {
  const user = userEvent.setup();

  render(<MobilePortal />);
  await user.click(screen.getByRole("button", { name: /enter portal/i }));

  return user;
}

async function loginWithStudentId(studentId: string, hasVoted = false) {
  getDocMock.mockResolvedValueOnce(
    createStudentSnapshot({
      exists: true,
      data: { has_voted: hasVoted },
    }),
  );

  const user = await openMobileLogin();
  await user.type(screen.getByLabelText(/student id/i), studentId);
  await user.click(screen.getByRole("button", { name: /verify id/i }));

  return user;
}

async function completeVisibleBallot() {
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

describe("College election end-to-end integration", () => {
  beforeEach(() => {
    adminSnapshotHandler = undefined;
    adminSnapshotErrorHandler = undefined;

    batchCommitMock.mockReset();
    batchSetMock.mockReset();
    batchUpdateMock.mockReset();
    collectionMock.mockClear();
    docMock.mockClear();
    getDocMock.mockReset();
    incrementMock.mockClear();
    onSnapshotMock.mockReset();
    serverTimestampMock.mockClear();
    unsubscribeMock.mockClear();
    writeBatchMock.mockReset();

    batchCommitMock.mockResolvedValue(undefined);
    writeBatchMock.mockReturnValue({
      commit: batchCommitMock,
      set: batchSetMock,
      update: batchUpdateMock,
    });
    onSnapshotMock.mockImplementation((_reference, onNext, onError) => {
      adminSnapshotHandler = onNext as (snapshot: unknown) => void;
      adminSnapshotErrorHandler = onError as (error: unknown) => void;
      return unsubscribeMock;
    });
  });

  it("rejects invalid IDs, blocks already-voted IDs, and admits valid voters", async () => {
    getDocMock.mockResolvedValueOnce(
      createStudentSnapshot({ exists: false, data: undefined }),
    );

    const invalidUser = await openMobileLogin();
    await invalidUser.type(screen.getByLabelText(/student id/i), "invalid001");
    await invalidUser.click(screen.getByRole("button", { name: /verify id/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Invalid Student ID.",
    );
    expect(screen.queryByText(/vote for chairman/i)).toBeNull();
  });

  it("blocks duplicate voters and routes a valid voter into the ballot", async () => {
    getDocMock.mockResolvedValueOnce(
      createStudentSnapshot({
        exists: true,
        data: { has_voted: true },
      }),
    );

    const duplicateUser = await openMobileLogin();
    await duplicateUser.type(screen.getByLabelText(/student id/i), "24bsc001");
    await duplicateUser.click(
      screen.getByRole("button", { name: /verify id/i }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "You have already voted.",
    );
    expect(screen.queryByText(/vote for chairman/i)).toBeNull();
  });

  it("renders the voting navigation menu and switches positions from the sidebar", async () => {
    const user = await loginWithStudentId("24bsc002");

    expect(
      await screen.findByRole("heading", { name: /vote for chairman/i }),
    ).toBeTruthy();

    const drawerButton = screen.getByRole("button", {
      name: /open election positions/i,
    });
    await user.click(drawerButton);
    expect(drawerButton.getAttribute("aria-expanded")).toBe("true");

    const chairman = getFirstCandidateForPosition("chairman");
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`select ${chairman.name}`, "i"),
      }),
    );

    expect(
      await screen.findByRole("heading", { name: /vote for vice chairman/i }),
    ).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Chairman" })[0]);

    expect(
      await screen.findByRole("heading", { name: /vote for chairman/i }),
    ).toBeTruthy();
  });

  it("submits a full ballot optimistically when Firestore reports an offline failure", async () => {
    batchCommitMock.mockRejectedValueOnce({ code: "unavailable" });
    await loginWithStudentId("24bsc003");

    await completeVisibleBallot();
    fireEvent.click(screen.getByRole("button", { name: /submit vote/i }));

    expect(
      await screen.findByRole("heading", {
        name: /vote submitted successfully/i,
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/connection error/i)).toBeNull();
    expect(screen.queryByText(/unable to submit/i)).toBeNull();
    expect(screen.queryByText(/submitting/i)).toBeNull();
    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "students",
        id: "24BSC003",
      }),
      expect.objectContaining({ has_voted: true }),
    );
    expect(incrementMock).toHaveBeenCalledWith(1);
  }, 15_000);

  it("updates the admin dashboard from live snapshots without resubscribing", async () => {
    render(<ResultsDashboard />);

    await act(async () => {
      adminSnapshotHandler?.(
        createBallotSnapshot([
          createCompleteBallot(),
          createCompleteBallot({ chairman: "c1", "vice-chairman": "vc2" }),
        ]),
      );
    });

    expect(
      screen.getByText("Total ballots").closest("article")?.textContent,
    ).toContain("2");
    expect(screen.getAllByText("Arjun Mehta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100% of 2").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    });

    expect(adminSnapshotErrorHandler).toBeTypeOf("function");
  });
});
