import { CANDIDATES, POSITIONS } from "@/data/electionData";
import { submitBallot } from "@/lib/voting";
import type { Vote } from "@/types/election";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Menu } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { db } from "../../firebase.js";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { SidebarMenu } from "./SidebarMenu";
import { VoteSuccessScreen } from "./VoteSuccessScreen";
import { VotingView } from "./VotingView";

interface KioskVotingDashboardProps {
  studentId?: string;
  onSessionComplete: () => void;
  mode?: "kiosk" | "mobile";
}

type DashboardView = "voting" | "confirmation" | "success";

const BALLOTS_COLLECTION = "ballots";
const CANDIDATE_TOTALS_COLLECTION = "candidate_totals";

function queueKioskBallot(votes: Vote) {
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

  const ballotReference = doc(collection(db, BALLOTS_COLLECTION));
  const batch = writeBatch(db);

  batch.set(ballotReference, {
    votes,
    source: "kiosk",
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

export const KioskVotingDashboard = memo(function KioskVotingDashboard({
  studentId,
  onSessionComplete,
  mode = "kiosk",
}: KioskVotingDashboardProps) {
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [votes, setVotes] = useState<Vote>({});
  const [view, setView] = useState<DashboardView>("voting");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const ballotSyncListenersRef = useRef(new Set<() => void>());
  const nextUnvotedIndex = POSITIONS.findIndex(
    (position) => !votes[position.id],
  );
  const currentPosition = POSITIONS[currentPositionIndex] ?? POSITIONS[0];

  const handleVote = useCallback((positionId: string, candidateId: string) => {
    setVotes((currentVotes) => {
      const nextVotes = { ...currentVotes, [positionId]: candidateId };
      const firstUnvotedIndex = POSITIONS.findIndex(
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
  }, []);

  const handlePositionSelect = useCallback(
    (positionId: string) => {
      const selectedIndex = POSITIONS.findIndex(
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
    [nextUnvotedIndex],
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

  useEffect(
    () => () => {
      for (const unsubscribe of ballotSyncListenersRef.current) unsubscribe();
      ballotSyncListenersRef.current.clear();
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (mode === "kiosk") {
      try {
        const { ballotReference, commitPromise } = queueKioskBallot(votes);

        // The atomic batch is now in Firestore's local mutation queue. Its
        // promise intentionally remains pending while the device is offline.
        setView("success");

        try {
          const unsubscribe = onSnapshot(
            ballotReference,
            { includeMetadataChanges: true },
            (snapshot) => {
              if (!snapshot.exists()) return;

              console.info("[Firestore] Kiosk ballot sync status", {
                ballotId: snapshot.id,
                pending: snapshot.metadata.hasPendingWrites,
                fromCache: snapshot.metadata.fromCache,
              });
            },
            (snapshotError) => {
              console.error("[Firestore] Kiosk ballot listener failed", {
                ballotId: ballotReference.id,
                code: snapshotError.code,
                error: snapshotError,
              });
            },
          );

          ballotSyncListenersRef.current.add(unsubscribe);
        } catch (listenerError) {
          console.error(
            "[Firestore] Unable to observe kiosk ballot sync status",
            {
              ballotId: ballotReference.id,
              error: listenerError,
            },
          );
        }

        void commitPromise
          .then(() => {
            console.info("[Firestore] Kiosk ballot synchronized", {
              ballotId: ballotReference.id,
            });
          })
          .catch((writeError) => {
            console.error("[Firestore] Kiosk ballot synchronization failed", {
              ballotId: ballotReference.id,
              code:
                typeof writeError === "object" &&
                writeError &&
                "code" in writeError
                  ? String(writeError.code)
                  : "unknown",
              error: writeError,
            });
          });
        return;
      } catch (writeError) {
        console.error("[Firestore] Unable to queue kiosk ballot", writeError);
        throw writeError;
      }
    } else {
      if (!studentId)
        throw new Error("The verified voter session has expired.");
      await submitBallot(studentId, votes);
    }
    setView("success");
  }, [mode, studentId, votes]);

  if (view === "success") {
    return <VoteSuccessScreen mode={mode} onReset={onSessionComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#040814] text-white">
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open election positions"
        aria-expanded={isSidebarOpen}
        className="fixed left-3 top-3 z-[90] flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0a0e1a]/90 text-blue-200 shadow-lg shadow-black/30 backdrop-blur-xl transition hover:bg-[#111a30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="md:hidden">
        <SidebarMenu
          positions={POSITIONS}
          votes={votes}
          currentPositionId={currentPosition.id}
          nextUnvotedIndex={nextUnvotedIndex}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onPositionSelect={handlePositionSelect}
        />
      </div>

      <div className="hidden md:block">
        <SidebarMenu
          positions={POSITIONS}
          votes={votes}
          currentPositionId={currentPosition.id}
          nextUnvotedIndex={nextUnvotedIndex}
          isOpen
          persistent
          onClose={() => undefined}
          onPositionSelect={handlePositionSelect}
        />
      </div>

      {mode === "mobile" && studentId && (
        <div className="fixed right-3 top-3 z-50 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 backdrop-blur-xl sm:right-5 sm:top-5">
          Voter: {studentId}
        </div>
      )}

      <div className="min-h-screen md:pl-80">
        {view === "voting" && (
          <VotingView
            positions={POSITIONS}
            candidates={CANDIDATES}
            currentPositionIndex={currentPositionIndex}
            votes={votes}
            onVote={handleVote}
          />
        )}

        {view === "confirmation" && (
          <ConfirmationScreen
            votes={votes}
            positions={POSITIONS}
            candidates={CANDIDATES}
            onConfirm={handleSubmit}
          />
        )}
      </div>
    </div>
  );
});
