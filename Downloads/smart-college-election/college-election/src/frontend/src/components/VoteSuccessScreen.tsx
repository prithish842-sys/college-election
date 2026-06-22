import { CheckCircle2, Keyboard } from "lucide-react";
import { memo, useEffect } from "react";

interface VoteSuccessScreenProps {
  mode: "kiosk" | "mobile";
  onReset: () => void;
}

export const VoteSuccessScreen = memo(function VoteSuccessScreen({
  mode,
  onReset,
}: VoteSuccessScreenProps) {
  useEffect(() => {
    if (mode !== "kiosk") return;

    const handleSecretReset = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.keyCode === 32) {
        event.preventDefault();
        onReset();
      }
    };

    window.addEventListener("keydown", handleSecretReset);
    return () => window.removeEventListener("keydown", handleSecretReset);
  }, [mode, onReset]);

  return (
    <main className="relative flex min-h-screen min-h-[100svh] items-center justify-center overflow-hidden bg-[#040814] px-4 py-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]"
      />
      <section className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-7 text-center shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="h-11 w-11" strokeWidth={1.5} />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
          Ballot recorded
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Thank You for Voting
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/55 sm:text-base">
          Your selections have been securely submitted. This voting session is
          complete.
        </p>

        {mode === "kiosk" ? (
          <div
            className="mt-8 flex items-center justify-center gap-2 text-xs text-white/20"
            aria-label="Waiting for the kiosk administrator"
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Session locked
          </div>
        ) : (
          <button
            type="button"
            onClick={onReset}
            className="mt-8 min-h-12 w-full rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/15 sm:w-auto sm:min-w-48"
          >
            Finish
          </button>
        )}
      </section>
    </main>
  );
});
