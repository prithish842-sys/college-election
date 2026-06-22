import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { KioskPortal } from "../components/KioskPortal";
import { MobilePortal } from "../components/MobilePortal";

const getDocMock = vi.fn();
const updateDocMock = vi.fn();
const docMock = vi.fn((...segments) => ({ path: segments.join("/") }));

const signInWithPhoneNumberMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const recaptchaClearMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args) => docMock(...args),
  getDoc: (...args) => getDocMock(...args),
  updateDoc: (...args) => updateDocMock(...args),
}));

vi.mock("firebase/auth", () => ({
  RecaptchaVerifier: vi.fn().mockImplementation(() => ({
    clear: recaptchaClearMock,
  })),
  signInWithPhoneNumber: (...args) => signInWithPhoneNumberMock(...args),
  signOut: (...args) => signOutMock(...args),
}));

vi.mock("../../firebase.js", () => ({
  auth: {},
  db: {},
}));

vi.mock("../components/HomePage", () => ({
  HomePage: ({ onStartVoting }) => (
    <button type="button" onClick={onStartVoting}>
      Enter Portal
    </button>
  ),
}));

vi.mock("../components/LogoMark", () => ({
  LogoMark: () => <div>Logo</div>,
}));

vi.mock("../components/SharedVotingUI", async () => {
  const actual = await vi.importActual("../components/VoteSuccessScreen.tsx");

  return {
    SharedVotingUI: ({ mode, onSessionComplete }) => {
      if (mode === "kiosk") {
        const { VoteSuccessScreen } = actual;

        return <VoteSuccessScreen mode="kiosk" onReset={onSessionComplete} />;
      }

      return <div>Mock Voting UI</div>;
    },
  };
});

function createSnapshot({ exists, data }) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

async function openMobileLogin() {
  const user = userEvent.setup();
  render(<MobilePortal />);
  await user.click(screen.getByRole("button", { name: /enter portal/i }));
  return user;
}

describe("Voting flow guards", () => {
  it("blocks login when the student ID does not exist in Firestore", async () => {
    getDocMock.mockResolvedValueOnce(
      createSnapshot({ exists: false, data: undefined }),
    );

    const user = await openMobileLogin();

    await user.type(screen.getByLabelText(/student id/i), "INVALID001");
    await user.type(screen.getByLabelText(/phone number/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    expect(
      await screen.findByText(/invalid student id or phone number/i),
    ).toBeTruthy();
    expect(signInWithPhoneNumberMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/enter otp/i)).toBeNull();
  });

  it("prevents the OTP flow when the voter has already voted", async () => {
    getDocMock.mockResolvedValueOnce(
      createSnapshot({
        exists: true,
        data: {
          student_id: "24BSC001",
          phone_number: "+919876543210",
          has_voted: true,
        },
      }),
    );

    const user = await openMobileLogin();

    await user.type(screen.getByLabelText(/student id/i), "24BSC001");
    await user.type(screen.getByLabelText(/phone number/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    expect(await screen.findByText(/already submitted a ballot/i)).toBeTruthy();
    expect(signInWithPhoneNumberMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: /verify your identity/i }),
    ).toBeTruthy();
  });

  it("keeps the kiosk success screen locked until the spacebar is pressed", async () => {
    const user = userEvent.setup();
    render(<KioskPortal />);

    await user.click(screen.getByRole("button", { name: /enter portal/i }));

    expect(
      await screen.findByRole("heading", { name: /thank you for voting/i }),
    ).toBeTruthy();

    fireEvent.keyDown(window, {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
    });

    expect(
      screen.getByRole("heading", { name: /thank you for voting/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /enter portal/i })).toBeNull();

    fireEvent.keyDown(window, {
      key: " ",
      code: "Space",
      keyCode: 32,
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /enter portal/i }),
      ).toBeTruthy();
    });
  });
});
