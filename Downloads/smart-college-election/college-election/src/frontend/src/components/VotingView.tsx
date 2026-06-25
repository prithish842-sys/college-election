import { CandidateCard } from "@/components/CandidateCard";
import { LogoMark } from "@/components/LogoMark";
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
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, #0a0e1a 0%, #0d1633 40%, #0a0e1a 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Position header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <LogoMark size={90} variant="plain" />
          </div>

          <h1
            className="font-display font-bold text-foreground mb-2"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #e2e8f0 30%, #93c5fd 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Vote for {currentPosition.title}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            {currentPosition.description}
          </p>
        </div>

        {/* Candidate grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
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
