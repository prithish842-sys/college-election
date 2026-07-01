import { CANDIDATES, POSITIONS } from "@/data/electionData";
import type { Vote } from "@/types/election";
import { Link } from "@tanstack/react-router";
import { collection, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  BarChart3,
  Crown,
  Download,
  Moon,
  Radio,
  Sun,
  Users,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../../firebase.js";
import { CountUp } from "./CountUp";

interface BallotRecord {
  votes?: Vote;
}

interface CandidateDetails {
  academicYear: string;
  department: string;
  rollNumber: string;
}

interface StandingCandidate {
  id: string;
  name: string;
  academicYear: string;
  department: string;
  rollNumber: string;
  votes: number;
  percentage: number;
  isLeading: boolean;
}

interface ChartCandidateData {
  name: string;
  votes: number;
  percentage?: number;
}

interface VoteTooltipPayload {
  payload: ChartCandidateData;
}

const defaultCandidateDetails: CandidateDetails = {
  academicYear: "Year not listed",
  department: "Department not listed",
  rollNumber: "ID not listed",
};

const voteFormatter = new Intl.NumberFormat("en-IN");
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

function VoteDistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: VoteTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;

  const candidate = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-xl shadow-slate-950/25">
      <p className="font-semibold text-white">{candidate.name}</p>
      <p className="mt-1 text-slate-200">
        {voteFormatter.format(candidate.votes)} votes
      </p>
      {typeof candidate.percentage === "number" && (
        <p className="text-xs text-slate-300">
          {Math.round(candidate.percentage)}% of this position
        </p>
      )}
    </div>
  );
}

function CandidateVoteBarChart({
  data,
  isDark,
}: {
  data: ChartCandidateData[];
  isDark: boolean;
}) {
  return (
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 20, right: 50, left: 20, bottom: 0 }}
    >
      <CartesianGrid
        horizontal={false}
        stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.25)"}
      />
      <XAxis type="number" hide={true} />
      <YAxis
        type="category"
        dataKey="name"
        stroke="#8884d8"
        width={150}
        tick={{ fill: "#cbd5e1" }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip content={<VoteDistributionTooltip />} />
      <Bar dataKey="votes" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
        <LabelList dataKey="votes" position="right" fill="#fff" />
      </Bar>
    </BarChart>
  );
}

export const ResultsDashboard = memo(function ResultsDashboard() {
  const [ballots, setBallots] = useState<Vote[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState(POSITIONS[0].id);
  const [isDark, setIsDark] = useState(true);
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

  const totalVotes = ballots.length;

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

  const standingCandidates = useMemo<StandingCandidate[]>(() => {
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

  const downloadCSV = useCallback(() => {
    const escapeCsvValue = (value: string | number) => {
      const normalizedValue = String(value);

      if (/[",\n\r]/.test(normalizedValue)) {
        return `"${normalizedValue.replace(/"/g, '""')}"`;
      }

      return normalizedValue;
    };

    const rows = [
      ["Position", selectedPosition.title],
      ["Total votes in position", votesInPosition],
      [],
      ["Rank", "Candidate", "Votes", "Percentage"],
      ...rankedStandingCandidates.map((candidate, index) => [
        index + 1,
        candidate.name,
        candidate.votes,
        `${Math.round(candidate.percentage)}%`,
      ]),
    ];
    const csvContent = rows
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `election_report_${selectedPosition.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rankedStandingCandidates, selectedPosition, votesInPosition]);

  const candidates = rankedStandingCandidates;

  if (import.meta.env.MODE !== "test") {
    console.log("RAW Candidates:", candidates);
  }

  const liveChartData = (candidates || []).map((candidate) => ({
    name: candidate.name || "Unknown",
    votes: Number(candidate.votes) || 0,
    percentage: Number(candidate.percentage) || 0,
  }));
  const testData = [
    { name: "Test User 1", votes: 15 },
    { name: "Test User 2", votes: 8 },
    { name: "Test User 3", votes: 2 },
  ];

  if (import.meta.env.MODE !== "test") {
    console.log("Sanitized Chart Data:", liveChartData);
  }

  const leadingCandidates = useMemo(
    () => rankedStandingCandidates.filter((candidate) => candidate.isLeading),
    [rankedStandingCandidates],
  );

  const leadingLabel =
    leadingCandidates.length > 0
      ? leadingCandidates.map((candidate) => candidate.name).join(", ")
      : "No leader yet";

  const canUseResponsiveChart = typeof ResizeObserver !== "undefined";
  const backgroundClassName = isDark
    ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white"
    : "bg-slate-50 text-slate-950";
  const glassClassName = isDark
    ? "rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-lg"
    : "rounded-2xl border border-gray-300 bg-white/70 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-lg";
  const interactiveGlassClassName = `${glassClassName} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`;
  const subtleGlassClassName = isDark
    ? "rounded-2xl border border-white/10 bg-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-lg"
    : "rounded-2xl border border-gray-300 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-lg";
  const headingClassName = isDark ? "text-white" : "text-slate-950";
  const mutedTextClassName = isDark ? "text-slate-300" : "text-slate-500";
  const faintTextClassName = isDark ? "text-slate-400" : "text-slate-400";
  const headerBorderClassName = isDark ? "border-white/10" : "border-slate-200";

  return (
    <main
      className={`min-h-screen transition-colors duration-500 ${backgroundClassName}`}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header
          className={`flex flex-col gap-5 border-b pb-6 transition-colors duration-500 lg:flex-row lg:items-end lg:justify-between ${headerBorderClassName}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center ${subtleGlassClassName}`}
            >
              <img
                src="/logo.png"
                alt="College Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-300"
                    : "border-slate-200 bg-white/70 text-slate-500"
                }`}
              >
                <Radio className="h-3.5 w-3.5 text-blue-600" />
                Live Results
              </span>
              <h1
                className={`mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl ${headingClassName}`}
              >
                Election Results
              </h1>
              <p
                className={`mt-2 max-w-2xl text-sm leading-6 ${mutedTextClassName}`}
              >
                Track submitted ballots, switch between positions, and compare
                candidate standings as Firebase updates arrive.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={downloadCSV}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.3)] focus-visible:ring-offset-slate-950"
                  : "border-gray-300 bg-white/70 text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-visible:ring-offset-slate-50"
              }`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Report
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Toggle light and dark results theme"
              onClick={() => setIsDark((currentTheme) => !currentTheme)}
              className={`inline-flex min-h-11 items-center justify-center gap-3 rounded-2xl border px-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.3)] focus-visible:ring-offset-slate-950"
                  : "border-gray-300 bg-white/70 text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-visible:ring-offset-slate-50"
              }`}
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
              <span
                className={`relative h-6 w-12 rounded-full transition-colors duration-300 ${
                  isDark ? "bg-slate-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    isDark ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </span>
              <Moon className="h-4 w-4" aria-hidden="true" />
            </button>

            <Link
              to="/"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.3)] focus-visible:ring-offset-slate-950"
                  : "border-gray-300 bg-white/70 text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-visible:ring-offset-slate-50"
              }`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to voting
            </Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1fr_1fr]">
          <article className={`${interactiveGlassClassName} p-5`}>
            <span className="sr-only">Total ballots</span>
            <div className="flex items-center justify-between gap-4">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${faintTextClassName}`}
              >
                Total Votes
              </p>
              <BarChart3 className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
            <p
              className={`mt-4 font-display text-4xl font-semibold ${headingClassName}`}
            >
              <CountUp value={totalVotes} ariaHidden />
              <span className="sr-only">
                {voteFormatter.format(totalVotes)}
              </span>
            </p>
            <p className={`mt-2 text-sm ${mutedTextClassName}`}>
              Submitted ballots counted in real time.
            </p>
          </article>

          <article className={`${interactiveGlassClassName} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${faintTextClassName}`}
              >
                Selected Position
              </p>
              <Users
                className={`h-5 w-5 ${faintTextClassName}`}
                aria-hidden="true"
              />
            </div>
            <h2
              className={`mt-4 font-display text-2xl font-semibold ${headingClassName}`}
            >
              {selectedPosition.title}
            </h2>
            <p className={`mt-2 text-sm ${mutedTextClassName}`}>
              {votesInPosition} votes recorded for this position.
            </p>
          </article>

          <article className={`${interactiveGlassClassName} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${faintTextClassName}`}
              >
                Live Leader
              </p>
              <Crown className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <h2
              className={`mt-4 truncate font-display text-2xl font-semibold ${headingClassName}`}
            >
              {leadingLabel}
            </h2>
            <p className={`mt-2 text-sm ${mutedTextClassName}`}>
              {leadingCandidates.length > 0
                ? `${leadingCandidates[0].votes} votes at the top of this race.`
                : "Leaders appear after the first vote is submitted."}
            </p>
          </article>
        </section>

        {loadError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {loadError}
          </p>
        )}

        <section
          aria-label="Election positions"
          className={`${subtleGlassClassName} overflow-x-auto p-2`}
        >
          <div className="flex min-w-max gap-2">
            {POSITIONS.map((position) => {
              const isActive = position.id === selectedPositionId;
              const positionVotes = getPositionCandidates(position.id).reduce(
                (total, candidate) =>
                  total + (candidateTotals.get(candidate.id) ?? 0),
                0,
              );

              return (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => selectPosition(position.id)}
                  aria-label={position.title}
                  aria-pressed={isActive}
                  className={`min-h-11 rounded-lg px-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : isDark
                        ? "text-slate-400 hover:bg-white/10 hover:text-slate-100"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <span className="block whitespace-nowrap">
                    {position.title}
                  </span>
                  <span
                    className={`block text-xs font-medium ${
                      isActive
                        ? "text-slate-300"
                        : isDark
                          ? "text-slate-500"
                          : "text-slate-400"
                    }`}
                  >
                    {positionVotes} votes
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <article className={`${glassClassName} p-5 sm:p-6`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${faintTextClassName}`}
                >
                  Standing members
                </p>
                <h2
                  className={`mt-2 font-display text-2xl font-semibold ${headingClassName}`}
                >
                  {selectedPosition.title}
                </h2>
                <p className={`mt-1 text-sm ${mutedTextClassName}`}>
                  Live ranking for the selected ballot position.
                </p>
              </div>
              <p className={`text-sm ${mutedTextClassName}`}>
                {votesInPosition} total votes in this race
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {rankedStandingCandidates.map((candidate, index) => (
                <div
                  key={candidate.id}
                  className={`rounded-2xl border p-4 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    candidate.isLeading
                      ? isDark
                        ? "border-emerald-400/50 bg-emerald-400/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
                        : "border-emerald-400 bg-emerald-50/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                      : isDark
                        ? "border-white/10 bg-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
                        : "border-gray-300 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${faintTextClassName}`}
                      >
                        Rank {index + 1}
                      </p>
                      <h3
                        className={`mt-1 truncate text-base font-semibold ${headingClassName}`}
                      >
                        {candidate.name}
                      </h3>
                      <p
                        className={`mt-1 truncate text-sm ${mutedTextClassName}`}
                      >
                        {candidate.academicYear} {candidate.department}
                      </p>
                      <p className={`truncate text-xs ${faintTextClassName}`}>
                        {candidate.rollNumber}
                      </p>
                    </div>

                    {candidate.isLeading && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          isDark
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                            : "border-emerald-200 bg-white/80 text-emerald-700"
                        }`}
                      >
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        Leading
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${faintTextClassName}`}
                      >
                        Votes
                      </p>
                      <p
                        className={`mt-1 font-display text-3xl font-semibold ${headingClassName}`}
                      >
                        {voteFormatter.format(candidate.votes)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${mutedTextClassName}`}
                    >
                      {Math.round(candidate.percentage)}% of {votesInPosition}
                    </p>
                  </div>

                  <div
                    className={`mt-3 h-2 overflow-hidden rounded-full ${
                      isDark ? "bg-white/10" : "bg-slate-100"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        candidate.isLeading ? "bg-emerald-600" : "bg-blue-600"
                      }`}
                      style={{ width: `${candidate.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article
            className={`${glassClassName} px-5 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${faintTextClassName}`}
                >
                  Vote Comparison
                </p>
                <h2
                  className={`mt-2 font-display text-2xl font-semibold ${headingClassName}`}
                >
                  Horizontal Bar Chart
                </h2>
                <p className={`mt-1 text-sm ${mutedTextClassName}`}>
                  Candidate vote distribution for the selected position.
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>

            <div className="w-full h-[400px] min-h-[400px] mt-4">
              {canUseResponsiveChart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <CandidateVoteBarChart data={testData} isDark={isDark} />
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] overflow-x-auto">
                  <CandidateVoteBarChart data={testData} isDark={isDark} />
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
});
