import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MobilePortal } from "../components/MobilePortal";

const { docMock, getDocMock, sharedVotingUIMock } = vi.hoisted(() => ({
  docMock: vi.fn((...segments) => ({ path: segments.join("/") })),
  getDocMock: vi.fn(),
  sharedVotingUIMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args) => docMock(...args),
  getDoc: (...args) => getDocMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  db: { app: "mock-firestore" },
}));

vi.mock("../components/HomePage", () => ({
  HomePage: ({ onStartVoting }) => (
    <button type="button" onClick={onStartVoting}>
      Enter Portal
    </button>
  ),
}));

vi.mock("../components/LogoMark", () => ({
  LogoMark: () => <div data-testid="logo-mark" />,
}));

vi.mock("../components/SharedVotingUI", () => ({
  SharedVotingUI: (props) => {
    sharedVotingUIMock(props);

    return (
      <section data-testid="mobile-voting-ui">
        Mobile voting session for {props.studentId}
      </section>
    );
  },
}));

function createStudentSnapshot({ exists, data }) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function openMobileLogin() {
  const user = userEvent.setup();

  render(<MobilePortal />);
  await user.click(screen.getByRole("button", { name: /enter portal/i }));

  return user;
}

describe("MobilePortal authentication", () => {
  it("rejects an invalid Student ID and does not enter the voting UI", async () => {
    getDocMock.mockResolvedValueOnce(
      createStudentSnapshot({ exists: false, data: undefined }),
    );

    const user = await openMobileLogin();

    await user.type(screen.getByLabelText(/student id/i), "bad-id");
    await user.click(screen.getByRole("button", { name: /verify id/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Invalid Student ID.",
    );
    expect(
      screen.getByRole("heading", { name: /verify your identity/i }),
    ).toBeTruthy();
    expect(screen.queryByTestId("mobile-voting-ui")).toBeNull();
    expect(sharedVotingUIMock).not.toHaveBeenCalled();
    expect(docMock).toHaveBeenCalledWith(
      { app: "mock-firestore" },
      "students",
      "BAD-ID",
    );
  });

  it("blocks a voter who has already voted and does not enter the voting UI", async () => {
    getDocMock.mockResolvedValueOnce(
      createStudentSnapshot({
        exists: true,
        data: { has_voted: true },
      }),
    );

    const user = await openMobileLogin();

    await user.type(screen.getByLabelText(/student id/i), "24bsc001");
    await user.click(screen.getByRole("button", { name: /verify id/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "You have already voted.",
    );
    expect(
      screen.getByRole("heading", { name: /verify your identity/i }),
    ).toBeTruthy();
    expect(screen.queryByTestId("mobile-voting-ui")).toBeNull();
    expect(sharedVotingUIMock).not.toHaveBeenCalled();
  });

  it("shows loading during verification, clears it, and enters mobile voting for an eligible voter", async () => {
    const verification = createDeferred();
    getDocMock.mockReturnValueOnce(verification.promise);

    const user = await openMobileLogin();

    await user.type(screen.getByLabelText(/student id/i), "  24bsc002  ");
    await user.click(screen.getByRole("button", { name: /verify id/i }));

    expect(screen.getByRole("button", { name: /verifying id/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /verifying id/i }).disabled).toBe(
      true,
    );

    verification.resolve(
      createStudentSnapshot({
        exists: true,
        data: { has_voted: false },
      }),
    );

    expect(
      (await screen.findByTestId("mobile-voting-ui")).textContent,
    ).toContain("Mobile voting session for 24BSC002");

    await waitFor(() => {
      expect(screen.queryByText(/verifying id/i)).toBeNull();
    });
    expect(sharedVotingUIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "mobile",
        studentId: "24BSC002",
      }),
    );
  });
});
