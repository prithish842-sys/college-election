import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  LoaderCircle,
  LockKeyhole,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  type FormEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { auth, db } from "../../firebase.js";
import { HomePage } from "./HomePage";
import { LogoMark } from "./LogoMark";
import { SharedVotingUI } from "./SharedVotingUI";

type MobileViewState = "home" | "login" | "otp" | "voting";

interface VoterRecord {
  has_voted?: unknown;
  phone_number?: unknown;
  student_id?: unknown;
}

interface EligibleVoter {
  studentId: string;
  phoneNumber: string;
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

function normalizeIndianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 11) return `+${digits}`;

  return "";
}

function friendlyAuthError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code.includes("invalid-phone-number"))
    return "Enter a valid phone number.";
  if (code.includes("invalid-verification-code"))
    return "That OTP is incorrect. Please try again.";
  if (code.includes("code-expired"))
    return "That OTP has expired. Return to login and request a new one.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Please wait before trying again.";
  if (code.includes("operation-not-allowed"))
    return "Phone sign-in is not enabled in Firebase Authentication.";
  if (
    code.includes("app-not-authorized") ||
    code.includes("unauthorized-domain")
  )
    return "This website domain is not authorized for Firebase phone sign-in. Add it in Firebase Authentication settings.";
  if (code.includes("network-request-failed"))
    return "Network verification failed. Check your connection and try again.";
  if (
    code.includes("captcha-check-failed") ||
    code.includes("invalid-app-credential") ||
    code.includes("missing-app-credential")
  )
    return "Security verification failed. Please retry. If it continues, confirm this domain is authorized in Firebase Authentication.";

  return "Unable to complete verification. Check your connection and try again.";
}

export const MobilePortal = memo(function MobilePortal() {
  const [viewState, setViewState] = useState<MobileViewState>("home");
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [eligibleVoter, setEligibleVoter] = useState<EligibleVoter | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isMountedRef = useRef(true);
  const shouldUseFirebaseTestAuth =
    import.meta.env.DEV &&
    import.meta.env.VITE_FIREBASE_DISABLE_APP_VERIFICATION === "true";

  const clearRecaptcha = useCallback(() => {
    try {
      window.recaptchaVerifier?.clear();
    } finally {
      window.recaptchaVerifier = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearRecaptcha();
    };
  }, [clearRecaptcha]);

  useEffect(() => {
    if (!shouldUseFirebaseTestAuth) return;

    auth.settings.appVerificationDisabledForTesting = true;

    return () => {
      auth.settings.appVerificationDisabledForTesting = false;
    };
  }, []);

  const getRecaptcha = useCallback(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "sign-in-button",
        {
          size: "invisible",
          callback: () => {
            // signInWithPhoneNumber continues after reCAPTCHA is solved.
          },
          "expired-callback": () => {
            if (isMountedRef.current) {
              setError(
                "Security verification expired. Please tap Send OTP again.",
              );
            }
            clearRecaptcha();
          },
        },
      );
    }

    return window.recaptchaVerifier;
  }, [clearRecaptcha]);

  const enterPortal = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setViewState("login");
  }, []);

  const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const normalizedStudentId = studentId.trim();
    const normalizedPhone = normalizeIndianPhoneNumber(phoneNumber);

    if (!normalizedStudentId) {
      setError("Enter your Student ID.");
      return;
    }

    if (!normalizedPhone) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const voterReference = doc(db, "voters", normalizedStudentId);
      const voterSnapshot = await getDoc(voterReference);

      if (!isMountedRef.current) return;

      if (!voterSnapshot.exists()) {
        setError("Invalid Student ID or phone number.");
        return;
      }

      const voter = voterSnapshot.data() as VoterRecord;

      if (voter.has_voted === true) {
        setError("This voter has already submitted a ballot.");
        return;
      }

      if (voter.has_voted !== false) {
        setError(
          "Voting eligibility could not be verified. Contact an administrator.",
        );
        return;
      }

      const storedStudentId =
        typeof voter.student_id === "string" ? voter.student_id.trim() : "";
      const storedPhone =
        typeof voter.phone_number === "string" ? voter.phone_number.trim() : "";

      if (
        (storedStudentId && storedStudentId !== normalizedStudentId) ||
        storedPhone !== normalizedPhone
      ) {
        setError("Invalid Student ID or phone number.");
        return;
      }

      const result = await signInWithPhoneNumber(
        auth,
        normalizedPhone,
        getRecaptcha(),
      );

      if (!isMountedRef.current) return;

      setEligibleVoter({
        studentId: normalizedStudentId,
        phoneNumber: normalizedPhone,
      });
      setConfirmation(result);
      setPhoneNumber(normalizedPhone);
      setViewState("otp");
    } catch (sendError) {
      console.error("OTP send failed:", sendError);
      // Failed verifier instances cannot always be reused. A fresh verifier is
      // created on the next Send OTP attempt without requiring a page reload.
      try {
        window.recaptchaVerifier?.clear();
      } finally {
        window.recaptchaVerifier = null;
      }
      if (isMountedRef.current) {
        setError(friendlyAuthError(sendError));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmation || !eligibleVoter || otp.length !== 6 || isLoading)
      return;

    setIsLoading(true);
    setError("");

    try {
      await confirmation.confirm(otp);
      if (!isMountedRef.current) return;
      clearRecaptcha();
      setViewState("voting");
    } catch (verificationError) {
      console.error("OTP verification failed:", verificationError);
      if (isMountedRef.current) {
        setError(friendlyAuthError(verificationError));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const returnToLogin = useCallback(() => {
    clearRecaptcha();
    setViewState("login");
    setOtp("");
    setConfirmation(null);
    setEligibleVoter(null);
    setError("");
  }, [clearRecaptcha]);

  const resetToHome = useCallback(() => {
    clearRecaptcha();
    void signOut(auth).catch((signOutError) => {
      console.error("Auth sign-out failed:", signOutError);
    });
    setStudentId("");
    setPhoneNumber("");
    setOtp("");
    setConfirmation(null);
    setEligibleVoter(null);
    setError("");
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: "auto" });
    setViewState("home");
  }, [clearRecaptcha]);

  if (viewState === "home") {
    return <HomePage onStartVoting={enterPortal} />;
  }

  if (viewState === "voting" && eligibleVoter) {
    return (
      <SharedVotingUI
        mode="mobile"
        studentId={eligibleVoter.studentId}
        onSessionComplete={resetToHome}
      />
    );
  }

  const isOtpView = viewState === "otp";

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
            {isOtpView ? "Enter OTP" : "Verify your identity"}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">
            {isOtpView
              ? `We sent a 6-digit code to ${eligibleVoter?.phoneNumber ?? phoneNumber}.`
              : "Enter the Student ID and phone number registered with the college."}
          </p>
          {shouldUseFirebaseTestAuth && (
            <p className="mt-3 max-w-sm rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200/90">
              Local test mode is active. Use a Firebase Authentication test
              phone number and its matching OTP from the Firebase console.
            </p>
          )}
        </div>

        {isOtpView ? (
          <form className="min-w-0 space-y-5" onSubmit={verifyOtp}>
            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                One-time password
              </label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35"
                  aria-hidden="true"
                />
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                    if (error) setError("");
                  }}
                  placeholder="000000"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-center font-mono text-xl tracking-[0.45em] text-white outline-none transition placeholder:text-white/20 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
            </div>
            <PortalError error={error} />
            <SubmitButton
              isLoading={isLoading}
              disabled={otp.length !== 6}
              loadingText="Verifying OTP..."
              label="Verify & continue"
            />
            <button
              type="button"
              onClick={returnToLogin}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 py-1 text-sm text-white/50 transition hover:text-white/80"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
          </form>
        ) : (
          <form className="min-w-0 space-y-4" onSubmit={sendOtp}>
            <PortalInput
              id="student-id"
              label="Student ID"
              value={studentId}
              placeholder="Enter your student ID"
              autoComplete="username"
              icon="student"
              onChange={(value) => {
                setStudentId(value);
                if (error) setError("");
              }}
            />
            <PortalInput
              id="phone-number"
              label="Phone Number"
              value={phoneNumber}
              placeholder="98765 43210"
              autoComplete="tel"
              icon="phone"
              onChange={(value) => {
                setPhoneNumber(value);
                if (error) setError("");
              }}
            />
            <PortalError error={error} />
            <SubmitButton
              id="sign-in-button"
              isLoading={isLoading}
              disabled={!studentId.trim() || !phoneNumber.trim()}
              loadingText="Sending OTP..."
              label="Send OTP"
            />
          </form>
        )}
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
  icon: "student" | "phone";
  onChange: (value: string) => void;
}

function PortalInput({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  icon,
  onChange,
}: PortalInputProps) {
  const Icon = icon === "student" ? BadgeCheck : Phone;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-white/80"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35"
          aria-hidden="true"
        />
        <input
          id={id}
          type={icon === "phone" ? "tel" : "text"}
          inputMode={icon === "phone" ? "tel" : "text"}
          autoComplete={autoComplete}
          autoCapitalize={icon === "student" ? "none" : undefined}
          spellCheck={icon === "student" ? false : undefined}
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
  id?: string;
  isLoading: boolean;
  disabled: boolean;
  loadingText: string;
  label: string;
}

function SubmitButton({
  id,
  isLoading,
  disabled,
  loadingText,
  label,
}: SubmitButtonProps) {
  return (
    <button
      id={id}
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
