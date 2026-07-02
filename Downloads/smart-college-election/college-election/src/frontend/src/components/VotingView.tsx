import { CandidateCard } from "@/components/CandidateCard";
import type { Candidate, Position, Vote } from "@/types/election";
import { memo, useCallback, useMemo } from "react";

interface VotingViewProps {
  positions: Position[];
  candidates: Candidate[];
  currentPositionIndex: number;
  votes: Vote;
  onVote: (positionId: string, candidateId: string) => void;
}

export const VotingView = memo(function VotingView({
  positions,
  candidates,
  currentPositionIndex,
  votes,
  onVote,
}: VotingViewProps) {
  const currentPosition = positions?.[currentPositionIndex] ?? positions?.[0];
  const currentPositionId = currentPosition?.id ?? "";
  const positionCandidates = useMemo(
    () =>
      currentPositionId
        ? candidates.filter(
            (candidate) => candidate?.positionId === currentPositionId,
          )
        : [],
    [candidates, currentPositionId],
  );
  const selectedId = currentPositionId ? votes?.[currentPositionId] : undefined;

  const handleVote = useCallback(
    (candidateId: string) => {
      if (!currentPositionId) return;
      onVote(currentPositionId, candidateId);
    },
    [currentPositionId, onVote],
  );

  if (!currentPosition) {
    return null;
  }

  return (
    <div className="flex h-screen min-h-[720px] overflow-hidden bg-white text-slate-950">
      <div className="mx-auto flex h-full w-full max-w-[1640px] flex-col px-5 py-5 sm:px-7 lg:px-9">
        <div className="shrink-0 text-center">
          <h1
            className="mb-2 font-display font-bold text-slate-950"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.6rem)",
            }}
          >
            Vote for {currentPosition.title}
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-6 text-slate-500">
            {currentPosition.description}
          </p>
        </div>

        <div
          className="mt-5 grid min-h-0 flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          {positionCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={selectedId === candidate.id}
              onSelect={handleVote}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
