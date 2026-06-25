import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsDashboard } from "../components/ResultsDashboard";

const { collectionMock, onSnapshotMock, unsubscribeMock } = vi.hoisted(() => ({
  collectionMock: vi.fn((...segments) => ({ path: segments.join("/") })),
  onSnapshotMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

let pushSnapshot;
let pushSnapshotError;

vi.mock("firebase/firestore", () => ({
  collection: (...args) => collectionMock(...args),
  onSnapshot: (...args) => onSnapshotMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  db: { app: "mock-firestore" },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function createSnapshot(ballots) {
  return {
    docs: ballots.map((votes, index) => ({
      id: `ballot-${index + 1}`,
      data: () => ({ votes }),
    })),
  };
}

function getTotalBallotsPanel() {
  return screen.getByText("Total ballots").closest("article");
}

function getStandingMembersPanel() {
  return screen.getByText("Standing members").closest("article");
}

describe("Admin ResultsDashboard live data", () => {
  beforeEach(() => {
    pushSnapshot = undefined;
    pushSnapshotError = undefined;
    collectionMock.mockClear();
    unsubscribeMock.mockClear();
    onSnapshotMock.mockReset();
    onSnapshotMock.mockImplementation((_reference, onNext, onError) => {
      pushSnapshot = onNext;
      pushSnapshotError = onError;
      return unsubscribeMock;
    });
  });

  it("binds live onSnapshot ballot data and updates visible totals immediately", async () => {
    render(<ResultsDashboard />);

    await act(async () => {
      pushSnapshot(
        createSnapshot([
          {
            chairman: "c1",
            "vice-chairman": "vc1",
            secretary: "s1",
            treasurer: "t1",
            "sports-head": "sp1",
            "cultural-head": "cu1",
            "technical-lead": "tl1",
            "class-representative": "cr1",
          },
          {
            chairman: "c1",
            "vice-chairman": "vc2",
            secretary: "s2",
            treasurer: "t2",
            "sports-head": "sp2",
            "cultural-head": "cu2",
            "technical-lead": "tl2",
            "class-representative": "cr2",
          },
          {
            chairman: "c2",
            "vice-chairman": "vc2",
            secretary: "s2",
            treasurer: "t2",
            "sports-head": "sp2",
            "cultural-head": "cu2",
            "technical-lead": "tl2",
            "class-representative": "cr2",
          },
        ]),
      );
    });

    expect(within(getTotalBallotsPanel()).getByText("3")).toBeTruthy();
    expect(
      within(getStandingMembersPanel()).getByText("Arjun Mehta"),
    ).toBeTruthy();
    expect(within(getStandingMembersPanel()).getByText("2")).toBeTruthy();
    expect(screen.getByText("67% of 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Vice Chairman" }));

    expect(
      within(getStandingMembersPanel()).getByText("Ishaan Gupta"),
    ).toBeTruthy();
    expect(screen.getByText("67% of 3")).toBeTruthy();
  });

  it("unsubscribes the live Firestore listener on unmount", () => {
    const { unmount } = render(<ResultsDashboard />);

    expect(collectionMock).toHaveBeenCalledWith(
      { app: "mock-firestore" },
      "ballots",
    );
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("renders a zero-vote empty state without undefined data crashes", async () => {
    render(<ResultsDashboard />);

    await act(async () => {
      pushSnapshot(createSnapshot([]));
    });

    expect(within(getTotalBallotsPanel()).getByText("0")).toBeTruthy();
    expect(screen.getAllByText("No votes yet").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Live standings will appear here once ballots are submitted.",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("0% of 0").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Live results are temporarily unavailable."),
    ).toBeNull();
  });

  it("shows a subscription error state without crashing live results", async () => {
    render(<ResultsDashboard />);

    await act(async () => {
      pushSnapshotError(new Error("network down"));
    });

    expect(
      screen.getByText("Live results are temporarily unavailable."),
    ).toBeTruthy();
  });
});
