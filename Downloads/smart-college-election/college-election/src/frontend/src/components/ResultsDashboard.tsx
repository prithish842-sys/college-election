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
import { utils, writeFile } from "xlsx";
import { db } from "../../firebase.js";
import { CountUp } from "./CountUp";

interface BallotRecord {
  votes?: Vote;
  boothId?: string;
}

interface CountedBallotRecord {
  votes: Vote;
  boothId?: string;
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

interface ReportRow {
  Section: string;
  Position: string;
  Candidate: string;
  "Candidate ID": string;
  Votes: number | string;
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

function getBallotSignature(ballot: CountedBallotRecord) {
  return `${ballot.boothId ?? ""}:${getVoteSignature(ballot.votes)}`;
}

function areBallotsEqual(
  currentBallots: CountedBallotRecord[],
  nextBallots: CountedBallotRecord[],
) {
  return (
    currentBallots.length === nextBallots.length &&
    currentBallots.every(
      (ballot, index) =>
        getBallotSignature(ballot) === getBallotSignature(nextBallots[index]),
    )
  );
}

function getReportVoteTotals(ballotsToCount: CountedBallotRecord[]) {
  const totals = new Map<string, number>();

  for (const ballot of ballotsToCount) {
    for (const candidateId of Object.values(ballot.votes)) {
      totals.set(candidateId, (totals.get(candidateId) ?? 0) + 1);
    }
  }

  return totals;
}

function getLeadingCandidateSummary(
  positionId: string,
  totals: Map<string, number>,
) {
  const positionCandidates = getPositionCandidates(positionId);
  const highestVotes = positionCandidates.reduce(
    (currentHighest, candidate) =>
      Math.max(currentHighest, totals.get(candidate.id) ?? 0),
    0,
  );

  if (highestVotes === 0) {
    return {
      candidateId: "",
      candidateName: "No votes yet",
      votes: 0,
    };
  }

  const leaders = positionCandidates.filter(
    (candidate) => (totals.get(candidate.id) ?? 0) === highestVotes,
  );

  return {
    candidateId: leaders.map((candidate) => candidate.id).join(", "),
    candidateName: leaders.map((candidate) => candidate.name).join(", "),
    votes: highestVotes,
  };
}

function createReportSheet(rows: ReportRow[]) {
  const sheet = utils.json_to_sheet(rows);

  sheet["!cols"] = [
    { wch: 24 },
    { wch: 28 },
    { wch: 34 },
    { wch: 18 },
    { wch: 14 },
  ];

  return sheet;
}

function formatBoothLabel(boothId: string) {
  const normalizedBoothId = boothId.trim();
  const boothNumber = normalizedBoothId.match(/^booth[-_\s]*(\d+)$/i)?.[1];

  if (boothNumber) {
    return `Booth ${boothNumber}`;
  }

  return normalizedBoothId || "Unassigned Booth";
}

function sanitizeSheetName(sheetName: string) {
  return (
    sheetName.replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim() ||
    "Sheet"
  ).slice(0, 31);
}

function getUniqueSheetName(sheetName: string, usedSheetNames: Set<string>) {
  const safeSheetName = sanitizeSheetName(sheetName);
  let uniqueSheetName = safeSheetName;
  let duplicateCount = 2;

  while (usedSheetNames.has(uniqueSheetName)) {
    const suffix = ` ${duplicateCount}`;
    uniqueSheetName = `${safeSheetName.slice(0, 31 - suffix.length)}${suffix}`;
    duplicateCount += 1;
  }

  usedSheetNames.add(uniqueSheetName);
  return uniqueSheetName;
}

export const ResultsDashboard = memo(function ResultsDashboard() {
  const [ballots, setBallots] = useState<CountedBallotRecord[]>([]);
  const [selectedBooth, setSelectedBooth] = useState("Total");
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
              ?.flatMap((ballotDocument) => {
                const ballot = ballotDocument.data?.() as
                  | BallotRecord
                  | undefined;

                if (!ballot?.votes) {
                  return [];
                }

                const countedBallot: CountedBallotRecord = {
                  votes: ballot.votes,
                };
                const boothId = ballot.boothId?.trim();

                if (boothId) {
                  countedBallot.boothId = boothId;
                }

                return [countedBallot];
              }) ?? [];

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

  const boothOptions = useMemo(() => {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return Array.from(
      new Set(
        ballots
          .map((ballot) => ballot.boothId)
          .filter((boothId): boothId is string => Boolean(boothId)),
      ),
    ).sort(collator.compare);
  }, [ballots]);

  useEffect(() => {
    if (selectedBooth !== "Total" && !boothOptions.includes(selectedBooth)) {
      setSelectedBooth("Total");
    }
  }, [boothOptions, selectedBooth]);

  const filteredVotes = useMemo(() => {
    if (selectedBooth === "Total") {
      return ballots.map((ballot) => ballot.votes);
    }

    return ballots
      .filter((ballot) => ballot.boothId === selectedBooth)
      .map((ballot) => ballot.votes);
  }, [ballots, selectedBooth]);

  const totalVotes = filteredVotes.length;

  const candidateTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const ballot of filteredVotes) {
      for (const candidateId of Object.values(ballot)) {
        totals.set(candidateId, (totals.get(candidateId) ?? 0) + 1);
      }
    }

    return totals;
  }, [filteredVotes]);

  const selectedPosition = useMemo(
    () =>
      POSITIONS.find((position) => position.id === selectedPositionId) ??
      POSITIONS[0],
    [selectedPositionId],
  );

  const selectPosition = useCallback((positionId: string) => {
    setSelectedPositionId(positionId);
  }, []);

  const selectBooth = useCallback((boothId: string) => {
    setSelectedBooth(boothId);
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

  const downloadExcelReport = useCallback(() => {
    const workbook = utils.book_new();
    const usedSheetNames = new Set<string>();
    const overallTotals = getReportVoteTotals(ballots);
    const summaryRows: ReportRow[] = [
      {
        Section: "Election Summary",
        Position: "Total Overall Votes",
        Candidate: "",
        "Candidate ID": "",
        Votes: ballots.length,
      },
      ...POSITIONS.map((position) => {
        const leader = getLeadingCandidateSummary(position.id, overallTotals);

        return {
          Section: "Global Leader",
          Position: position.title,
          Candidate: leader.candidateName,
          "Candidate ID": leader.candidateId,
          Votes: leader.votes,
        };
      }),
    ];

    utils.book_append_sheet(
      workbook,
      createReportSheet(summaryRows),
      getUniqueSheetName("Summary", usedSheetNames),
    );

    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const ballotsByBooth = new Map<string, CountedBallotRecord[]>();

    for (const ballot of ballots) {
      const boothId = ballot.boothId?.trim() || "Unassigned Booth";
      const boothBallots = ballotsByBooth.get(boothId) ?? [];

      boothBallots.push(ballot);
      ballotsByBooth.set(boothId, boothBallots);
    }

    for (const [boothId, boothBallots] of [...ballotsByBooth.entries()].sort(
      ([firstBoothId], [secondBoothId]) =>
        collator.compare(firstBoothId, secondBoothId),
    )) {
      const boothTotals = getReportVoteTotals(boothBallots);
      const boothRows: ReportRow[] = [
        {
          Section: "Booth Summary",
          Position: "Total Votes Cast",
          Candidate: "",
          "Candidate ID": "",
          Votes: boothBallots.length,
        },
        ...POSITIONS.map((position) => {
          const leader = getLeadingCandidateSummary(position.id, boothTotals);

          return {
            Section: "Booth Leader",
            Position: position.title,
            Candidate: leader.candidateName,
            "Candidate ID": leader.candidateId,
            Votes: leader.votes,
          };
        }),
        ...POSITIONS.flatMap((position) =>
          getPositionCandidates(position.id).map((candidate) => ({
            Section: "Candidate Breakdown",
            Position: position.title,
            Candidate: candidate.name,
            "Candidate ID": candidate.id,
            Votes: boothTotals.get(candidate.id) ?? 0,
          })),
        ),
      ];

      utils.book_append_sheet(
        workbook,
        createReportSheet(boothRows),
        getUniqueSheetName(formatBoothLabel(boothId), usedSheetNames),
      );
    }

    writeFile(
      workbook,
      `election_report_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }, [ballots]);

  const candidates = rankedStandingCandidates;

  if (import.meta.env.MODE !== "test") {
    console.log("RAW Candidates:", candidates);
  }

  const leadingCandidates = useMemo(
    () => rankedStandingCandidates.filter((candidate) => candidate.isLeading),
    [rankedStandingCandidates],
  );

  const leadingLabel =
    leadingCandidates.length > 0
      ? leadingCandidates.map((candidate) => candidate.name).join(", ")
      : "No leader yet";

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
              onClick={downloadExcelReport}
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
          aria-label="Election booths"
          className={`${subtleGlassClassName} overflow-x-auto p-2`}
        >
          <div className="flex min-w-max gap-2">
            {["Total", ...boothOptions].map((boothId) => {
              const isActive = boothId === selectedBooth;
              const boothVotes =
                boothId === "Total"
                  ? ballots.length
                  : ballots.filter((ballot) => ballot.boothId === boothId)
                      .length;

              return (
                <button
                  key={boothId}
                  type="button"
                  onClick={() => selectBooth(boothId)}
                  aria-label={boothId}
                  aria-pressed={isActive}
                  className={`min-h-11 rounded-lg px-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : isDark
                        ? "text-slate-400 hover:bg-white/10 hover:text-slate-100"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <span className="block whitespace-nowrap">{boothId}</span>
                  <span
                    className={`block text-xs font-medium ${
                      isActive
                        ? "text-slate-300"
                        : isDark
                          ? "text-slate-500"
                          : "text-slate-400"
                    }`}
                  >
                    {boothVotes} votes
                  </span>
                </button>
              );
            })}
          </div>
        </section>

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

        <section className="grid gap-6">
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

        </section>
      </div>
    </main>
  );
});
