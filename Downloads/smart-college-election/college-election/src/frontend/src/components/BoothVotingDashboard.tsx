import { CANDIDATES, POSITIONS } from "@/data/electionData";
import { submitBallot } from "@/lib/voting";
import type { Vote } from "@/types/election";
import {
  type DocumentReference,
  collection,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Menu } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../firebase.js";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { SidebarMenu } from "./SidebarMenu";
import { VoteSuccessScreen } from "./VoteSuccessScreen";
import { VotingView } from "./VotingView";

interface BoothVotingDashboardProps {
  studentId?: string;
  boothId?: string;
  onSessionComplete: () => void;
  mode?: "booth" | "mobile";
}

type DashboardView = "voting" | "confirmation" | "success";

const BALLOTS_COLLECTION = "ballots";
const CANDIDATE_TOTALS_COLLECTION = "candidate_totals";
const MOBILE_BALLOT_POSITIONS = POSITIONS.filter((position) =>
  CANDIDATES.some((candidate) => candidate.positionId === position.id),
);

function getFirestoreErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String(error.code).toLowerCase()
    : "unknown";
}

function isWriteContentionError(error: unknown) {
  const code = getFirestoreErrorCode(error);
  return (
    code.includes("deadline-exceeded") || code.includes("failed-precondition")
  );
}

function isNetworkRelatedError(error: unknown) {
  const code = getFirestoreErrorCode(error);
  return (
    code.includes("unavailable") ||
    code.includes("deadline-exceeded") ||
    code.includes("network-request-failed")
  );
}

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function getValidatedBoothId(boothId: string | undefined) {
  const normalizedBoothId = boothId?.trim();

  if (!normalizedBoothId) {
    throw new Error("Booth ID is missing from the voting URL.");
  }

  return normalizedBoothId;
}

function shouldTreatAsQueuedWrite(error: unknown, writeStarted = true) {
  return isNetworkRelatedError(error) || (writeStarted && isBrowserOffline());
}

function createBeepAudioUrl() {
  const sampleRate = 44_100;
  const duration = 0.16;
  const frequency = 880;
  const sampleCount = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const fade = 1 - index / sampleCount;
    const sample =
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) * fade * 0.25;
    view.setInt16(44 + index * 2, sample * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function playSuccessBeep() {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;

  let audioUrl = "";

  try {
    audioUrl = createBeepAudioUrl();
    const audio = new Audio(audioUrl);
    audio.volume = 0.45;
    audio.addEventListener(
      "ended",
      () => {
        URL.revokeObjectURL(audioUrl);
      },
      { once: true },
    );
    void audio.play().catch(() => {
      URL.revokeObjectURL(audioUrl);
    });
  } catch {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }
}

function FinalSubmitLoader() {
  return (
    <div className="vote-loader" aria-label="Submitting vote" role="status">
      <style>
        {`
          .vote-loader .loader {
            display: flex;
            position: relative;
            justify-items: center;
            align-items: center;
            gap: 1rem;
            height: 55px;
            width: 200px;
            overflow: hidden;
          }

          .vote-loader .container {
            width: 100%;
            display: flex;
            flex-direction: column;
            height: 200px;
            position: relative;
            align-items: center;
          }

          .vote-loader .carousel {
            display: flex;
            gap: 1rem;
            flex-direction: column;
            position: absolute;
            width: 100%;
            transform-origin: center;
            animation-delay: 2s;
          }

          .vote-loader .loader .container:nth-child(3) {
            justify-content: flex-start;
            justify-items: flex-start;
            animation: vote-loader-scroll-up 4s infinite ease-in-out;
            animation-delay: 3s;
          }

          .vote-loader .loader .container:nth-child(2) {
            justify-content: flex-end;
            justify-items: flex-end;
            animation: vote-loader-scroll-down 4s infinite ease-in-out;
            animation-delay: 3s;
          }

          .vote-loader .loader .container:nth-child(1) {
            justify-content: flex-end;
            justify-items: flex-end;
            animation: vote-loader-scroll-down 3s infinite ease-in-out;
            animation-delay: 3s;
          }

          .vote-loader .love {
            background: red;
            display: flex;
            width: 30px;
            height: 30px;
            position: relative;
            align-items: center;
            justify-content: center;
            left: 8px;
            margin: 0.8rem 4px;
            transform: rotate(45deg);
            animation-delay: 2s;
          }

          .vote-loader .love::before, .vote-loader .love::after {
            content: "";
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: red;
          }

          .vote-loader .love::before {
            left: -16px;
          }

          .vote-loader .love::after {
            top: -16px;
          }

          .vote-loader .death {
            display: flex;
            width: 100%;
            height: 55px;
            position: relative;
            align-items: center;
            justify-content: center;
            animation: vote-loader-rotation 3s infinite ease-in-out;
            animation-delay: 1s;
          }

          .vote-loader .death:after {
            content: "";
            height: 63px;
            position: absolute;
            border-left: 12px solid red;
            transform: rotate(45deg);
            border-radius: 8px;
            top: -4px;
          }

          .vote-loader .death:before {
            content: "";
            height: 60px;
            position: absolute;
            border-left: 12px solid red;
            transform: rotate(-45deg);
          }

          .vote-loader .loader:hover {
            animation: none;
          }

          .vote-loader .robots {
            display: flex;
            width: 100%;
            height: 55px;
            justify-content: space-between;
            background-color: #ff0000;
            border-radius: 0 8px 8px;
            padding: 8px;
            animation-delay: 5s;
          }

          .vote-loader .robots::after {
            content: "";
            width: 12px;
            height: 12px;
            top: 0;
            left: 0;
            background-color: #ffffff;
            border-radius: 50%;
            animation-delay: 2s;
            animation: vote-loader-blink 0.5s 2 forwards;
          }

          .vote-loader .robots::before {
            content: "";
            width: 12px;
            height: 12px;
            top: 0;
            left: 0;
            background-color: #ffffff;
            border-radius: 50%;
            animation-delay: 2s;
            animation: vote-loader-blink 0.5s 2 forwards;
          }

          @keyframes vote-loader-scroll-up {
            0% {
              transform: translateY(0);
              filter: blur(0);
            }

            30% {
              transform: translateY(-150%);
              filter: blur(10px);
            }

            60% {
              transform: translateY(0);
              filter: blur(0px);
            }
          }

          @keyframes vote-loader-scroll-down {
            0% {
              transform: translateY(0);
              filter: blur(0);
            }

            30% {
              transform: translateY(150%);
              filter: blur(10px);
            }

            60% {
              transform: translateY(0);
              filter: blur(0px);
            }
          }

          @keyframes vote-loader-rotation {
            20%, 100% {
              transform: rotate(180deg);
            }
          }

          @keyframes vote-loader-blink {
            0% {
              height: 0;
            }

            20% {
              height: 12px;
            }

            100% {
              height: 12px;
            }
          }
        `}
      </style>
      <div className="loader">
        {["love", "death", "robots"].map((itemClass) => (
          <div className="container" key={itemClass}>
            <div className="carousel">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed visual slots for the loader animation.
                  key={index}
                  className={itemClass}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function queueBoothBallot(votes: Vote, boothId: string | undefined) {
  const hasEveryVote = POSITIONS.every((position) => {
    const candidateId = votes[position.id];
    return CANDIDATES.some(
      (candidate) =>
        candidate.id === candidateId && candidate.positionId === position.id,
    );
  });

  if (!hasEveryVote) {
    throw new Error("Please vote for every position before submitting.");
  }

  const validatedBoothId = getValidatedBoothId(boothId);
  const ballotReference = doc(collection(db, BALLOTS_COLLECTION));
  const batch = writeBatch(db);

  batch.set(ballotReference, {
    votes,
    boothId: validatedBoothId,
    source: "booth",
    submitted_at: serverTimestamp(),
  });

  for (const [positionId, candidateId] of Object.entries(votes)) {
    const candidate = CANDIDATES.find(
      (entry) => entry.id === candidateId && entry.positionId === positionId,
    );

    if (!candidate) {
      throw new Error("One or more selected candidates are invalid.");
    }

    batch.set(
      doc(db, CANDIDATE_TOTALS_COLLECTION, candidate.id),
      {
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        position_id: candidate.positionId,
        votes_count: increment(1),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    ballotReference,
    commitPromise: batch.commit(),
  };
}

export const BoothVotingDashboard = memo(function BoothVotingDashboard({
  studentId,
  boothId,
  onSessionComplete,
  mode = "booth",
}: BoothVotingDashboardProps) {
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [votes, setVotes] = useState<Vote>({});
  const [view, setView] = useState<DashboardView>("voting");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [queuedBoothBallot, setQueuedBoothBallot] =
    useState<DocumentReference | null>(null);
  const submissionStartedRef = useRef(false);
  const finalSubmitResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ballotPositions =
    mode === "mobile" ? MOBILE_BALLOT_POSITIONS : POSITIONS;
  const nextUnvotedIndex = useMemo(
    () => ballotPositions.findIndex((position) => !votes[position.id]),
    [ballotPositions, votes],
  );
  const currentPosition = useMemo(
    () => ballotPositions[currentPositionIndex] ?? ballotPositions[0],
    [ballotPositions, currentPositionIndex],
  );

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const noop = useCallback(() => undefined, []);

  const resetBoothForNextVoter = useCallback(() => {
    setVotes({});
    setCurrentPositionIndex(0);
    setView("voting");
    setIsSidebarOpen(false);
    setQueuedBoothBallot(null);
    setIsFinalSubmitting(false);
    submissionStartedRef.current = false;
  }, []);

  const scheduleBoothReset = useCallback(() => {
    if (finalSubmitResetTimeoutRef.current) {
      clearTimeout(finalSubmitResetTimeoutRef.current);
    }

    finalSubmitResetTimeoutRef.current = setTimeout(() => {
      resetBoothForNextVoter();
      finalSubmitResetTimeoutRef.current = null;
    }, 3000);
  }, [resetBoothForNextVoter]);

  const handleVote = useCallback(
    (positionId: string, candidateId: string) => {
      setVotes((currentVotes) => {
        const nextVotes = { ...currentVotes, [positionId]: candidateId };
        const firstUnvotedIndex = ballotPositions.findIndex(
          (position) => !nextVotes[position.id],
        );

        if (firstUnvotedIndex === -1) {
          setView("confirmation");
        } else {
          setCurrentPositionIndex(firstUnvotedIndex);
          setView("voting");
        }

        return nextVotes;
      });
    },
    [ballotPositions],
  );

  const handlePositionSelect = useCallback(
    (positionId: string) => {
      const selectedIndex = ballotPositions.findIndex(
        (position) => position.id === positionId,
      );

      if (
        selectedIndex === -1 ||
        (nextUnvotedIndex !== -1 && selectedIndex > nextUnvotedIndex)
      ) {
        return;
      }

      setCurrentPositionIndex(selectedIndex);
      setView("voting");
      setIsSidebarOpen(false);
    },
    [ballotPositions, nextUnvotedIndex],
  );

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    return () => {
      if (finalSubmitResetTimeoutRef.current) {
        clearTimeout(finalSubmitResetTimeoutRef.current);
        finalSubmitResetTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!queuedBoothBallot) return;

    try {
      return onSnapshot(
        queuedBoothBallot,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot?.exists?.()) return;

          // Metadata-only observation avoids React state updates and render
          // thrashing while still exposing pending/synchronized status.
          console.info("[Firestore] Booth ballot sync status", {
            ballotId: snapshot.id,
            pending: snapshot.metadata?.hasPendingWrites,
            fromCache: snapshot.metadata?.fromCache,
          });
        },
        (snapshotError) => {
          console.error("[Firestore] Booth ballot listener failed", {
            ballotId: queuedBoothBallot.id,
            code: snapshotError.code,
            error: snapshotError,
          });
        },
      );
    } catch (listenerError) {
      console.error("[Firestore] Unable to observe booth ballot sync status", {
        ballotId: queuedBoothBallot.id,
        error: listenerError,
      });
    }
  }, [queuedBoothBallot]);

  const handleSubmit = useCallback(async () => {
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    playSuccessBeep();
    setIsFinalSubmitting(true);
    let writeStarted = false;

    try {
      if (mode === "booth") {
        const { ballotReference, commitPromise } = queueBoothBallot(
          votes,
          boothId,
        );
        writeStarted = true;

        // The atomic batch is now in Firestore's local mutation queue. Its
        // promise intentionally remains pending while the device is offline.
        setQueuedBoothBallot(ballotReference);
        scheduleBoothReset();

        void commitPromise
          .then(() => {
            console.info("[Firestore] Booth ballot synchronized", {
              ballotId: ballotReference.id,
            });
          })
          .catch((writeError) => {
            const failureDetails = {
              ballotId: ballotReference.id,
              code: getFirestoreErrorCode(writeError),
              error: writeError,
            };

            if (shouldTreatAsQueuedWrite(writeError)) {
              console.warn("Offline caching active", failureDetails);
            } else if (isWriteContentionError(writeError)) {
              console.warn(
                "[Firestore] Booth ballot synchronization failed",
                failureDetails,
              );
            } else {
              console.error(
                "[Firestore] Booth ballot synchronization failed",
                failureDetails,
              );
            }
          });
        return;
      }

      if (!studentId)
        throw new Error("The verified voter session has expired.");
      await submitBallot(studentId, votes);
      setTimeout(() => {
        setIsFinalSubmitting(false);
        setView("success");
      }, 3000);
    } catch (writeError) {
      const code = getFirestoreErrorCode(writeError);

      if (shouldTreatAsQueuedWrite(writeError, writeStarted)) {
        console.warn("Offline caching active", { code, error: writeError });
        scheduleBoothReset();
        return;
      }

      submissionStartedRef.current = false;
      setIsFinalSubmitting(false);

      if (isWriteContentionError(writeError)) {
        console.warn("[Firestore] Ballot write contention detected", {
          code,
          error: writeError,
        });
        throw new Error(
          "The voting service is temporarily busy. Please submit your ballot again.",
          { cause: writeError },
        );
      }

      console.error("[Firestore] Unable to submit ballot", {
        code,
        error: writeError,
      });
      throw writeError;
    }
  }, [boothId, mode, scheduleBoothReset, studentId, votes]);

  if (view === "success") {
    return <VoteSuccessScreen mode={mode} onReset={onSessionComplete} />;
  }

  if (isFinalSubmitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <FinalSubmitLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <button
        type="button"
        onClick={openSidebar}
        aria-label="Open election positions"
        aria-expanded={isSidebarOpen}
        className="fixed left-3 top-3 z-[90] flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-700 shadow-lg shadow-slate-200/80 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="md:hidden">
        <SidebarMenu
          positions={ballotPositions}
          votes={votes}
          currentPositionId={currentPosition?.id ?? ""}
          nextUnvotedIndex={nextUnvotedIndex}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onPositionSelect={handlePositionSelect}
        />
      </div>

      <div className="hidden md:block">
        <SidebarMenu
          positions={ballotPositions}
          votes={votes}
          currentPositionId={currentPosition?.id ?? ""}
          nextUnvotedIndex={nextUnvotedIndex}
          isOpen
          persistent
          onClose={noop}
          onPositionSelect={handlePositionSelect}
        />
      </div>

      {mode === "mobile" && studentId && (
        <div className="fixed right-3 top-3 z-50 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm sm:right-5 sm:top-5">
          Voter: {studentId}
        </div>
      )}

      <div className="min-h-screen overflow-hidden bg-white md:pl-80">
        {view === "voting" && (
          <VotingView
            positions={ballotPositions}
            candidates={CANDIDATES}
            currentPositionIndex={currentPositionIndex}
            votes={votes}
            onVote={handleVote}
          />
        )}

        {view === "confirmation" && (
          <ConfirmationScreen
            votes={votes}
            positions={ballotPositions}
            candidates={CANDIDATES}
            onConfirm={handleSubmit}
          />
        )}
      </div>
    </div>
  );
});
