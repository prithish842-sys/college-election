import { doc, getDoc } from "firebase/firestore";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, memo, useCallback, useRef, useState } from "react";
import { db } from "../../firebase.js";
import { HomePage } from "./HomePage";
import { LogoMark } from "./LogoMark";
import { SharedVotingUI } from "./SharedVotingUI";

type MobileViewState = "home" | "login" | "voting";

interface VoterRecord {
  has_voted?: unknown;
}

const VERIFICATION_TIMEOUT_MS = 10_000;

async function getStudentSnapshot(studentId: string) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      getDoc(doc(db, "students", studentId)),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("Student ID verification timed out."));
        }, VERIFICATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export const MobilePortal = memo(function MobilePortal() {
  const [viewState, setViewState] = useState<MobileViewState>("home");
  const [studentId, setStudentId] = useState("");
  const [verifiedStudentId, setVerifiedStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const verificationInFlightRef = useRef(false);

  const enterPortal = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setViewState("login");
  }, []);

  const verifyStudentId = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (verificationInFlightRef.current) return;

    const normalizedStudentId = studentId.trim().toUpperCase();

    if (!normalizedStudentId) {
      setError("Enter your Student ID.");
      return;
    }

    verificationInFlightRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      const voterSnapshot = await getStudentSnapshot(normalizedStudentId);

      if (!voterSnapshot.exists()) {
        setError("Invalid Student ID.");
        return;
      }

      const voter = voterSnapshot.data() as VoterRecord;

      if (voter.has_voted === true) {
        setError("You have already voted.");
        return;
      }

      if (voter.has_voted !== false) {
        setError(
          "Voting eligibility could not be verified. Contact an administrator.",
        );
        return;
      }

      setVerifiedStudentId(normalizedStudentId);
      setViewState("voting");
    } catch (verificationError) {
      console.error("[Firestore] Student ID verification failed", {
        error: verificationError,
        studentId: normalizedStudentId,
      });
      setError("Unable to verify your Student ID. Please try again.");
    } finally {
      verificationInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const resetToHome = useCallback(() => {
    setStudentId("");
    setVerifiedStudentId("");
    setError("");
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: "auto" });
    setViewState("home");
  }, []);

  if (viewState === "home") {
    return <HomePage onStartVoting={enterPortal} />;
  }

  if (viewState === "voting" && verifiedStudentId) {
    return (
      <SharedVotingUI
        mode="mobile"
        studentId={verifiedStudentId}
        onSessionComplete={resetToHome}
      />
    );
  }

  return (
    <main className="relative flex min-h-screen min-h-[100svh] items-center justify-center overflow-hidden bg-[#040814] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]"
      />

      <section className="relative z-10 w-full min-w-0 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:max-w-md sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <LogoMark size={72} variant="plain" className="mb-5" />
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blue-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure mobile voting
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Verify your identity
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">
            Enter the Student ID registered with the college.
          </p>
        </div>

        <form className="min-w-0 space-y-4" onSubmit={verifyStudentId}>
          <PortalInput
            id="student-id"
            label="Student ID"
            value={studentId}
            placeholder="Enter your student ID"
            autoComplete="username"
            onChange={(value) => {
              setStudentId(value);
              if (error) setError("");
            }}
          />
          <PortalError error={error} />
          <SubmitButton
            isLoading={isLoading}
            disabled={!studentId.trim()}
            loadingText="Verifying ID..."
            label="Verify ID"
          />
        </form>
      </section>
    </main>
  );
});

interface PortalInputProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
}

function PortalInput({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
}: PortalInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-white/80"
      >
        {label}
      </label>
      <div className="relative">
        <BadgeCheck
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
          required
        />
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  isLoading: boolean;
  disabled: boolean;
  loadingText: string;
  label: string;
}

function SubmitButton({
  isLoading,
  disabled,
  loadingText,
  label,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

function PortalError({ error }: { error: string }) {
  return (
    <div className="min-h-6" aria-live="polite">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 text-xs leading-5 text-red-300/90"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
