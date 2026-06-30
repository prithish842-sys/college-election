import { LockKeyhole } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ResultsDashboard } from "./ResultsDashboard";

const ADMIN_PASSCODE =
  typeof import.meta.env?.VITE_RESULTS_ADMIN_PASSCODE === "string"
    ? import.meta.env.VITE_RESULTS_ADMIN_PASSCODE.trim()
    : "";

export function ResultsGuard() {
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ADMIN_PASSCODE) {
      setError("Admin results access is not configured.");
      return;
    }

    if (passcode === ADMIN_PASSCODE) {
      setError("");
      setIsAuthorized(true);
      return;
    }

    setError("Access denied - incorrect passcode.");
  };

  if (isAuthorized) return <ResultsDashboard />;

  return (
    <main className="relative flex min-h-screen min-h-[100svh] items-center justify-center overflow-hidden bg-[#040814] px-4 py-8 text-white sm:px-6 sm:py-12 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px] sm:h-[38rem] sm:w-[38rem]"
      />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-200 backdrop-blur-xl">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">
            Restricted access
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Election Results
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Enter the administrator passcode to view live election results.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="admin-passcode"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Admin Passcode
            </label>
            <input
              id="admin-passcode"
              name="adminPasscode"
              type="password"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value);
                if (error) setError("");
              }}
              autoComplete="current-password"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "passcode-error" : undefined}
              placeholder="Enter admin passcode"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none backdrop-blur-xl transition placeholder:text-white/30 focus:border-blue-400/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10 aria-[invalid=true]:border-red-400/40"
            />
            <div className="min-h-6 pt-2" aria-live="polite">
              {error && (
                <p id="passcode-error" className="text-xs text-red-300/90">
                  {error}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-xl transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040814] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!passcode}
          >
            View Results
          </button>
        </form>
      </section>
    </main>
  );
}
