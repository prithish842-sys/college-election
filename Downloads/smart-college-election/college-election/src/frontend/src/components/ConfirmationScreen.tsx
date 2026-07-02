import type { Candidate, Position, Vote } from "@/types/election";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { memo, useCallback, useMemo, useRef, useState } from "react";

interface ConfirmationScreenProps {
  votes: Vote;
  positions: Position[];
  candidates: Candidate[];
  onConfirm: () => Promise<void>;
}

export const ConfirmationScreen = memo(function ConfirmationScreen({
  votes,
  positions,
  candidates,
  onConfirm,
}: ConfirmationScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submissionLockedRef = useRef(false);

  const votedCandidatesByPosition = useMemo(() => {
    const candidateById = new Map(
      candidates.map((candidate) => [candidate?.id, candidate]),
    );

    return new Map(
      positions.map((position) => [
        position.id,
        candidateById.get(votes?.[position.id]),
      ]),
    );
  }, [candidates, positions, votes]);

  const handleConfirm = useCallback(async () => {
    if (submissionLockedRef.current || isSubmitting) return;

    // Ref assignment is synchronous, unlike React state batching, and closes
    // the same-tick double-tap window before the button rerenders as disabled.
    submissionLockedRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm();
    } catch (submissionError) {
      console.error("Ballot submission failed:", submissionError);
      submissionLockedRef.current = false;
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your ballot. Please try again.",
      );
      setIsSubmitting(false);
    }
  }, [isSubmitting, onConfirm]);

  return (
    <div
      className="flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] px-3 py-3 sm:px-4 sm:py-4"
      style={{
        background: "#F9FAFB",
      }}
    >
      <motion.div
        data-ocid="confirmation.panel"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-3xl"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "1.5rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* Top gradient band */}
        <div
          aria-hidden="true"
          style={{
            height: 4,
            background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
          }}
        />

        <div className="px-4 py-4 sm:px-8 sm:py-5">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "backOut" }}
            className="mb-3 flex justify-center"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
              style={{
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.12)",
              }}
            >
              <CheckCircle2
                size={34}
                strokeWidth={1.5}
                style={{
                  color: "#2563EB",
                }}
              />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="mb-4 text-center"
          >
            <h1
              className="font-display mb-1 font-bold text-[#111827]"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "clamp(1.35rem, 4vw, 1.9rem)",
              }}
            >
              Your vote has been cast
            </h1>
            <p className="text-xs font-medium text-[#4B5563] sm:text-sm">
              All {positions.length} positions have been recorded.
            </p>
          </motion.div>

          {/* Summary table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mb-4 overflow-hidden rounded-xl bg-white"
            style={{ border: "1px solid #E5E7EB" }}
          >
            {positions.map((position, index) => {
              const voted = votedCandidatesByPosition.get(position.id);
              return (
                <div
                  key={position.id}
                  data-ocid={`confirmation.result.item.${index + 1}`}
                  className="flex items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2"
                  style={{
                    background: index % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
                    borderBottom:
                      index < positions.length - 1
                        ? "1px solid #E5E7EB"
                        : "none",
                  }}
                >
                  <span className="flex-shrink-0 text-sm sm:text-base">
                    {position.icon}
                  </span>
                  <span
                    className="min-w-0 flex-shrink-0 text-sm font-semibold sm:text-base"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      color: "#374151",
                      width: "clamp(9.5rem, 28vw, 13rem)",
                    }}
                  >
                    {position.title}
                  </span>
                  <span
                    className="flex-1 truncate text-lg font-bold sm:text-xl"
                    style={{
                      color: voted ? "#111827" : "#9CA3AF",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    {voted?.name ?? "Not voted"}
                  </span>
                  {voted && (
                    <CheckCircle2
                      size={16}
                      style={{ color: "#2563EB", flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}
          </motion.div>

          {error && (
            <p
              role="alert"
              className="mb-3 flex items-start justify-center gap-2 text-center text-xs leading-5 text-red-600"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {/* Final submission */}
          <div className="flex justify-center">
            <button
              type="button"
              data-ocid="confirmation.vote_again_button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="flex min-w-48 items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold tracking-widest disabled:cursor-wait"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isSubmitting ? "#93C5FD" : "#2563EB",
                border: "1px solid #2563EB",
                color: "#FFFFFF",
                letterSpacing: "0.1em",
                transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                opacity: isSubmitting ? 0.8 : 1,
                boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.2)",
              }}
            >
              {isSubmitting && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Submitting..." : "Submit vote"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
