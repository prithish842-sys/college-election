import { CANDIDATES, POSITIONS } from "@/data/electionData";
import type { Vote } from "@/types/election";
import { Link } from "@tanstack/react-router";
import { collection, onSnapshot } from "firebase/firestore";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../../firebase.js";

interface BallotRecord {
  votes?: Vote;
}

interface CandidateDetails {
  academicYear: string;
  department: string;
  rollNumber: string;
}

const defaultCandidateDetails: CandidateDetails = {
  academicYear: "Year not listed",
  department: "Department not listed",
  rollNumber: "ID not listed",
};

const leadingBadgeClassName =
  "inline-flex shrink-0 items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.08em] text-emerald-400";

function parseCandidateDetails(description: string): CandidateDetails {
  const normalizedDescription = description.trim().replace(/\s+/g, " ");

  if (!normalizedDescription) {
    return defaultCandidateDetails;
  }

  const parts = normalizedDescription.split(" ");

  if (parts.length < 4) {
    return {
      academicYear: defaultCandidateDetails.academicYear,
      department: normalizedDescription,
      rollNumber: defaultCandidateDetails.rollNumber,
    };
  }

  const academicYear = parts.slice(0, 2).join(" ");
  const rollNumber = parts.at(-1) ?? defaultCandidateDetails.rollNumber;
  const department = parts.slice(2, -1).join(" ");

  return {
    academicYear,
    department: department || defaultCandidateDetails.department,
    rollNumber,
  };
}

const positionCandidatesById = new Map(
  POSITIONS.map((position) => [
    position.id,
    CANDIDATES.filter((candidate) => candidate.positionId === position.id),
  ]),
);

const candidateDetailsById = new Map(
  CANDIDATES.map((candidate) => [
    candidate.id,
    parseCandidateDetails(candidate.description),
  ]),
);

function getPositionCandidates(positionId: string) {
  return positionCandidatesById.get(positionId) ?? [];
}

function getCandidateDetails(candidateId: string) {
  return candidateDetailsById.get(candidateId) ?? defaultCandidateDetails;
}

function getVoteSignature(vote: Vote | undefined) {
  return POSITIONS.map((position) => vote?.[position.id] ?? "").join("|");
}

function areBallotsEqual(currentBallots: Vote[], nextBallots: Vote[]) {
  return (
    currentBallots.length === nextBallots.length &&
    currentBallots.every(
      (ballot, index) =>
        getVoteSignature(ballot) === getVoteSignature(nextBallots[index]),
    )
  );
}

export const ResultsDashboard = memo(function ResultsDashboard() {
  const [ballots, setBallots] = useState<Vote[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState(POSITIONS[0].id);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;

    try {
      unsubscribe = onSnapshot(
        collection(db, "ballots"),
        (snapshot) => {
          const nextBallots =
            snapshot?.docs
              ?.map((ballotDocument) => {
                const ballot = ballotDocument.data?.() as
                  | BallotRecord
                  | undefined;
                return ballot?.votes;
              })
              .filter((votes): votes is Vote => Boolean(votes)) ?? [];

          setBallots((currentBallots) =>
            areBallotsEqual(currentBallots, nextBallots)
              ? currentBallots
              : nextBallots,
          );
          setLoadError("");
        },
        (error) => {
          console.error("Results subscription failed:", error);
          setLoadError("Live results are temporarily unavailable.");
        },
      );
    } catch (error) {
      console.error("Results subscription setup failed:", error);
      setLoadError("Live results are temporarily unavailable.");
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const candidateTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const ballot of ballots) {
      for (const candidateId of Object.values(ballot)) {
        totals.set(candidateId, (totals.get(candidateId) ?? 0) + 1);
      }
    }

    return totals;
  }, [ballots]);

  const selectedPosition = useMemo(
    () =>
      POSITIONS.find((position) => position.id === selectedPositionId) ??
      POSITIONS[0],
    [selectedPositionId],
  );
  const selectPosition = useCallback((positionId: string) => {
    setSelectedPositionId(positionId);
  }, []);

  const standingCandidates = useMemo(() => {
    const positionCandidates = getPositionCandidates(selectedPosition.id);
    const votesInPosition = positionCandidates.reduce(
      (total, candidate) => total + (candidateTotals.get(candidate.id) ?? 0),
      0,
    );
    const highestVotes = positionCandidates.reduce(
      (currentHighest, candidate) =>
        Math.max(currentHighest, candidateTotals.get(candidate.id) ?? 0),
      0,
    );

    return positionCandidates.map((candidate) => {
      const votes = candidateTotals.get(candidate.id) ?? 0;
      const percentage =
        votesInPosition > 0 ? (votes / votesInPosition) * 100 : 0;
      const details = getCandidateDetails(candidate.id);

      return {
        id: candidate.id,
        name: candidate.name,
        academicYear: details.academicYear,
        department: details.department,
        rollNumber: details.rollNumber,
        votes,
        percentage,
        isLeading: votes > 0 && votes === highestVotes,
      };
    });
  }, [candidateTotals, selectedPosition.id]);

  const votesInPosition = useMemo(
    () =>
      standingCandidates.reduce(
        (total, candidate) => total + candidate.votes,
        0,
      ),
    [standingCandidates],
  );

  const rankedStandingCandidates = useMemo(
    () =>
      [...standingCandidates].sort((a, b) => {
        if (b.votes !== a.votes) {
          return b.votes - a.votes;
        }

        return a.name.localeCompare(b.name);
      }),
    [standingCandidates],
  );

  const positionSnapshots = useMemo(
    () =>
      POSITIONS.map((position) => {
        const positionCandidates = getPositionCandidates(position.id);
        const highestVotes = positionCandidates.reduce(
          (currentHighest, candidate) =>
            Math.max(currentHighest, candidateTotals.get(candidate.id) ?? 0),
          0,
        );
        const leaders = positionCandidates
          .map((candidate) => {
            const details = getCandidateDetails(candidate.id);

            return {
              id: candidate.id,
              name: candidate.name,
              votes: candidateTotals.get(candidate.id) ?? 0,
              academicYear: details.academicYear,
              department: details.department,
              rollNumber: details.rollNumber,
            };
          })
          .filter(
            (candidate) => highestVotes > 0 && candidate.votes === highestVotes,
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        return {
          positionId: position.id,
          positionTitle: position.title,
          highestVotes,
          totalVotes: positionCandidates.reduce(
            (total, candidate) =>
              total + (candidateTotals.get(candidate.id) ?? 0),
            0,
          ),
          leaders,
        };
      }),
    [candidateTotals],
  );

  return (
    <main className="min-h-screen bg-[#0b1120] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
        <header className="flex flex-col gap-7 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-2.5 shadow-xl shadow-black/20 backdrop-blur-xl">
              <img
                src="/logo.png"
                alt="College Logo"
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              />
            </div>
            <div className="pt-0.5">
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-300">
                Admin Results
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
                Election Ballots
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[0.95rem]">
                Review every submitted ballot and track live candidate standings
                across all election positions.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm text-slate-200 transition hover:bg-white/[0.08] lg:self-auto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to voting
          </Link>
        </header>

        <section className="grid gap-4 py-8 lg:grid-cols-[19rem_1fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-400">
              Total ballots
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="font-display text-3xl font-semibold">
                {ballots.length}
              </p>
              <BarChart3
                className="h-5 w-5 text-slate-500"
                aria-hidden="true"
              />
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <p className="mb-3 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-400">
              Positions tracked
            </p>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((position) => (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => selectPosition(position.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition sm:text-sm ${
                    selectedPositionId === position.id
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200"
                  }`}
                >
                  {position.title}
                </button>
              ))}
            </div>
          </article>
        </section>

        {loadError && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-red-300/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200"
          >
            {loadError}
          </p>
        )}

        <section
          aria-labelledby="leader-overview"
          className="grid gap-4 border-b border-white/10 pb-8 sm:grid-cols-2 xl:grid-cols-4"
        >
          <h2 id="leader-overview" className="sr-only">
            Position leaders
          </h2>
          {positionSnapshots.map((position) => {
            const hasLeader = position.highestVotes > 0;
            const leaderNames = position.leaders.map(
              (candidate) => candidate.name,
            );
            const leadingCandidate = position.leaders[0];

            return (
              <button
                key={position.positionId}
                type="button"
                onClick={() => selectPosition(position.positionId)}
                className={`rounded-[1.8rem] border p-5 text-left shadow-lg shadow-black/10 transition ${
                  selectedPositionId === position.positionId
                    ? "border-white/20 bg-white/[0.07]"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {position.positionTitle}
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                    {position.totalVotes} votes
                  </span>
                </div>
                <p className="mt-5 text-sm text-slate-400">Top choice</p>
                <p className="mt-1 text-base text-slate-50">
                  {hasLeader ? leaderNames.join(", ") : "No votes yet"}
                </p>
                <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                  {leadingCandidate
                    ? `${leadingCandidate.academicYear} ${leadingCandidate.department}`
                    : "Live standings will appear here once ballots are submitted."}
                </p>
              </button>
            );
          })}
        </section>

        <section className="grid gap-4 pt-8 xl:grid-cols-[1.12fr_0.92fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-6">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Standing members
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">
                  {selectedPosition.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Live ranking for the selected ballot position.
                </p>
              </div>
              <div className="min-w-36 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
                <p className="text-[0.64rem] uppercase tracking-[0.2em] text-slate-400">
                  Votes in this position
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {votesInPosition}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {standingCandidates.map((candidate) => {
                return (
                  <div
                    key={candidate.id}
                    className="rounded-[1.7rem] border border-white/10 bg-[#0d1427]/85 p-4 shadow-lg shadow-black/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-50">
                          {candidate.name}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {candidate.academicYear} {candidate.department}
                        </p>
                        <p className="text-xs leading-5 text-slate-500">
                          {candidate.rollNumber}
                        </p>
                      </div>
                      {candidate.isLeading && (
                        <span className={leadingBadgeClassName}>Leading</span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-400">Votes</span>
                      <span className="font-semibold text-slate-100">
                        {candidate.votes}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          candidate.isLeading
                            ? "bg-emerald-400/80"
                            : "bg-slate-300/70"
                        }`}
                        style={{ width: `${candidate.percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">
                      {Math.round(candidate.percentage)}% of {votesInPosition}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-6">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-400">
              Position summary
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              {selectedPosition.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Candidate breakdown ordered by current vote count.
            </p>
            <div className="mt-5 space-y-3">
              {rankedStandingCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-[#0d1427]/85 px-4 py-3.5 shadow-lg shadow-black/10"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-50">
                        {candidate.name}
                      </h3>
                      {candidate.isLeading && (
                        <span className={leadingBadgeClassName}>Leading</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {candidate.academicYear} {candidate.department}
                    </p>
                    <p className="truncate text-[0.7rem] text-slate-500">
                      {candidate.rollNumber}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg font-semibold">
                      {candidate.votes}
                    </p>
                    <p className="text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                      Votes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
});
