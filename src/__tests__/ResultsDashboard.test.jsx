import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsDashboard } from "../components/ResultsDashboard";

let snapshotSuccessHandler;
let snapshotErrorHandler;

const collectionMock = vi.fn((...segments) => ({ path: segments.join("/") }));
const unsubscribeMock = vi.fn();
const onSnapshotMock = vi.fn((_reference, onNext, onError) => {
  snapshotSuccessHandler = onNext;
  snapshotErrorHandler = onError;
  return unsubscribeMock;
});

vi.mock("firebase/firestore", () => ({
  collection: (...args) => collectionMock(...args),
  onSnapshot: (...args) => onSnapshotMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  db: {},
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function createSnapshot(votesList) {
  return {
    docs: votesList.map((votes, index) => ({
      id: `ballot-${index + 1}`,
      data: () => ({ votes }),
    })),
  };
}

describe("ResultsDashboard", () => {
  beforeEach(() => {
    snapshotSuccessHandler = undefined;
    snapshotErrorHandler = undefined;
    unsubscribeMock.mockClear();
    onSnapshotMock.mockClear();
    collectionMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates live ballot totals and renders the current leaders", async () => {
    render(<ResultsDashboard />);

    await act(async () => {
      snapshotSuccessHandler(
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
        ]),
      );
    });

    const totalBallotsCard = screen
      .getByText("Total ballots")
      .closest("article");
    const standingMembersPanel = screen
      .getByText("Standing members")
      .closest("article");
    expect(within(totalBallotsCard).getByText("2")).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Chairman" }).length).toBe(2);
    expect(within(standingMembersPanel).getByText("Arjun Mehta")).toBeTruthy();
    expect(screen.getAllByText("Leading").length).toBeGreaterThan(0);
    expect(screen.getByText("100% of 2")).toBeTruthy();
  });

  it("reacts to later snapshot updates and handles ties across positions", async () => {
    render(<ResultsDashboard />);

    await act(async () => {
      snapshotSuccessHandler(
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
        ]),
      );
    });

    await act(async () => {
      snapshotSuccessHandler(
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

    fireEvent.click(screen.getByRole("button", { name: "Vice Chairman" }));

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Vice Chairman" }).length,
      ).toBe(2);
    });

    const viceChairmanPanel = screen
      .getByText("Standing members")
      .closest("article");

    expect(
      screen.getByText("Live ranking for the selected ballot position."),
    ).toBeTruthy();
    expect(within(viceChairmanPanel).getByText("Kavya Nair")).toBeTruthy();
    expect(within(viceChairmanPanel).getByText("Ishaan Gupta")).toBeTruthy();
    expect(screen.getAllByText("Leading").length).toBeGreaterThan(1);
  });

  it("shows a live-results error and unsubscribes on unmount", async () => {
    const { unmount } = render(<ResultsDashboard />);

    await act(async () => {
      snapshotErrorHandler(new Error("network down"));
    });

    expect(
      screen.getByText("Live results are temporarily unavailable."),
    ).toBeTruthy();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
