import { CANDIDATES, POSITIONS } from "@/data/electionData";
import { submitBallot, submitKioskBallot } from "@/lib/voting";
import type { Vote } from "@/types/election";
import { memo, useCallback, useState } from "react";
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

export const KioskVotingDashboard = memo(function KioskVotingDashboard({
  studentId,
  onSessionComplete,
  mode = "kiosk",
}: KioskVotingDashboardProps) {
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [votes, setVotes] = useState<Vote>({});
  const [view, setView] = useState<DashboardView>("voting");
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
    },
    [nextUnvotedIndex],
  );

  const handleSubmit = useCallback(async () => {
    if (mode === "kiosk") {
      await submitKioskBallot(votes);
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
