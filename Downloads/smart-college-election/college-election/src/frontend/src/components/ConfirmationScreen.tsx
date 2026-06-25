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
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{
        background:
          "linear-gradient(160deg, #0a0e1a 0%, #0d1633 50%, #0a0e1a 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <motion.div
        data-ocid="confirmation.panel"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-2xl"
        style={{
          background:
            "linear-gradient(145deg, rgba(13,22,51,0.9) 0%, rgba(10,14,26,0.95) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(37,99,235,0.3)",
          borderRadius: "1.5rem",
          boxShadow:
            "0 0 60px rgba(37,99,235,0.2), 0 24px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Top gradient band */}
        <div
          aria-hidden="true"
          style={{
            height: 4,
            background:
              "linear-gradient(90deg, #1e4a8a 0%, #2563eb 50%, #60a5fa 100%)",
            boxShadow: "0 0 16px rgba(37,99,235,0.6)",
          }}
        />

        <div className="px-6 sm:px-10 py-10">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "backOut" }}
            className="flex justify-center mb-6"
          >
            <div
              className="flex items-center justify-center w-20 h-20 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(30,74,138,0.35) 100%)",
                border: "1px solid rgba(96,165,250,0.4)",
                boxShadow: "0 0 32px rgba(37,99,235,0.35)",
              }}
            >
              <CheckCircle2
                size={44}
                strokeWidth={1.5}
                style={{
                  color: "#60a5fa",
                  filter: "drop-shadow(0 0 8px rgba(96,165,250,0.7))",
                }}
              />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-center mb-8"
          >
            <h1
              className="font-display font-bold mb-2"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
                letterSpacing: "-0.02em",
                background:
                  "linear-gradient(135deg, #e2e8f0 20%, #93c5fd 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Your vote has been cast
            </h1>
            <p className="text-muted-foreground text-sm">
              All {positions.length} positions have been recorded.
            </p>
          </motion.div>

          {/* Summary table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mb-8 rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(37,99,235,0.2)" }}
          >
            {positions.map((position, index) => {
              const voted = votedCandidatesByPosition.get(position.id);
              return (
                <div
                  key={position.id}
                  data-ocid={`confirmation.result.item.${index + 1}`}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background:
                      index % 2 === 0
                        ? "rgba(13,22,51,0.6)"
                        : "rgba(10,14,26,0.4)",
                    borderBottom:
                      index < positions.length - 1
                        ? "1px solid rgba(37,99,235,0.1)"
                        : "none",
                  }}
                >
                  <span className="text-base flex-shrink-0">
                    {position.icon}
                  </span>
                  <span
                    className="text-xs font-semibold min-w-0"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      color: "rgba(148,163,184,0.9)",
                      width: 140,
                      flexShrink: 0,
                    }}
                  >
                    {position.title}
                  </span>
                  <span
                    className="flex-1 text-sm font-medium truncate"
                    style={{
                      color: voted ? "#93c5fd" : "rgba(148,163,184,0.4)",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    {voted?.name ?? "Not voted"}
                  </span>
                  {voted && (
                    <CheckCircle2
                      size={14}
                      style={{ color: "#60a5fa", flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}
          </motion.div>

          {error && (
            <p
              role="alert"
              className="mb-5 flex items-start justify-center gap-2 text-center text-xs leading-5 text-red-300"
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
              className="flex min-w-48 items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold tracking-widest disabled:cursor-wait"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(30,74,138,0.25) 100%)",
                border: "1px solid rgba(37,99,235,0.4)",
                color: isSubmitting ? "#bfdbfe" : "#93c5fd",
                letterSpacing: "0.1em",
                transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                opacity: isSubmitting ? 0.8 : 1,
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
