import type { Candidate } from "@/types/election";
import { Check } from "lucide-react";
import { memo } from "react";

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  isSelected,
  onSelect,
}: CandidateCardProps) {
  const candidateId = candidate?.id ?? "";
  const candidateName = candidate?.name ?? "Candidate";
  const candidateDescription = candidate?.description ?? "";
  const candidateImageUrl = candidate?.imageUrl ?? "/logo.png";

  return (
    <button
      type="button"
      data-ocid="candidate.card"
      onClick={() => {
        if (candidateId) onSelect(candidateId);
      }}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? "Selected: " : "Select "}${candidateName}`}
      className="relative flex flex-col items-center text-center p-5 rounded-2xl cursor-pointer outline-none w-full"
      style={{
        background: isSelected
          ? "linear-gradient(145deg, rgba(13,22,51,0.95) 0%, rgba(16,32,64,0.98) 100%)"
          : "linear-gradient(145deg, rgba(13,22,51,0.7) 0%, rgba(10,14,26,0.85) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: isSelected
          ? "1.5px solid rgba(37,99,235,0.9)"
          : "1px solid rgba(37,99,235,0.15)",
        boxShadow: isSelected
          ? "0 0 28px rgba(37,99,235,0.4), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 4px 20px rgba(0,0,0,0.35)",
        transform: "translateZ(0)",
        transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(-6px) scale(1.02)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 12px 40px rgba(0,0,0,0.55), 0 0 16px rgba(37,99,235,0.2)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(37,99,235,0.4)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(0) scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 4px 20px rgba(0,0,0,0.35)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(37,99,235,0.15)";
        }
      }}
    >
      {/* Selected checkmark badge */}
      {isSelected && (
        <div
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full"
          style={{
            background: "linear-gradient(135deg, #1e4a8a 0%, #2563eb 100%)",
            boxShadow: "0 0 12px rgba(37,99,235,0.6)",
          }}
        >
          <Check size={13} strokeWidth={3} style={{ color: "#fff" }} />
        </div>
      )}

      {/* Avatar */}
      <div
        className="relative mb-4"
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          padding: 3,
          background: isSelected
            ? "linear-gradient(135deg, #1e4a8a, #2563eb, #60a5fa)"
            : "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(96,165,250,0.2))",
          transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <img
          src={candidateImageUrl}
          alt=""
          width={74}
          height={74}
          className="rounded-full object-cover"
          style={{
            background: "rgba(10,14,26,0.8)",
            display: "block",
          }}
        />
      </div>

      {/* Name */}
      <h3
        className="font-display font-bold text-foreground mb-1 leading-tight"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "1rem",
          letterSpacing: "-0.01em",
        }}
      >
        {candidateName}
      </h3>

      {/* Description */}
      <p
        className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1"
        style={{ lineHeight: 1.6 }}
      >
        {candidateDescription.slice(0, 90)}
        {candidateDescription.length > 90 ? "..." : ""}
      </p>

      {/* Select indicator */}
      <div
        data-ocid="candidate.select_button"
        className="w-full py-2 rounded-xl text-xs font-bold tracking-widest"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          background: isSelected
            ? "linear-gradient(135deg, #1e4a8a 0%, #2563eb 100%)"
            : "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(30,74,138,0.25) 100%)",
          border: isSelected
            ? "1px solid rgba(96,165,250,0.6)"
            : "1px solid rgba(37,99,235,0.3)",
          color: isSelected ? "#fff" : "#93c5fd",
          boxShadow: isSelected ? "0 0 16px rgba(37,99,235,0.4)" : "none",
          transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          letterSpacing: "0.12em",
        }}
      >
        {isSelected ? "Voted" : "Vote"}
      </div>
    </button>
  );
});
