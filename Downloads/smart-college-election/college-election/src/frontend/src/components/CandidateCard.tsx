import type { Candidate } from "@/types/election";
import { Check } from "lucide-react";
import { memo } from "react";

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getAvatarUrl(candidateName: string) {
  const seed = encodeURIComponent(candidateName);

  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=dbeafe,bfdbfe,e0f2fe&fontWeight=700`;
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  isSelected,
  onSelect,
}: CandidateCardProps) {
  const candidateId = candidate?.id ?? "";
  const candidateName = candidate?.name ?? "Candidate";
  const candidateDescription = candidate?.description ?? "";
  const avatarUrl = getAvatarUrl(candidateName);

  return (
    <article
      data-ocid="candidate.card"
      className={`group relative flex h-full min-h-[254px] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-white p-5 text-center transition duration-300 ease-in-out hover:bg-[#fdfdfd] ${
        isSelected ? "border-blue-500" : "border-slate-200 hover:border-blue-200"
      }`}
      style={{
        boxShadow: isSelected
          ? "rgba(37, 99, 235, 0.25) 0px 6px 12px -2px, rgba(37, 99, 235, 0.3) 0px 3px 7px -3px"
          : "rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow =
          "rgba(0, 0, 0, 0.09) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = isSelected
          ? "rgba(37, 99, 235, 0.25) 0px 6px 12px -2px, rgba(37, 99, 235, 0.3) 0px 3px 7px -3px"
          : "rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px";
      }}
    >
      {isSelected && (
        <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <Check size={15} strokeWidth={3} aria-hidden="true" />
        </div>
      )}

      <div className="mx-auto mt-1 flex h-[clamp(5rem,10vh,7rem)] w-[clamp(5rem,10vh,7rem)] shrink-0 items-center justify-center rounded-full bg-blue-50 p-1.5">
        <img
          src={avatarUrl}
          alt=""
          width={112}
          height={112}
          className="h-full w-full rounded-full object-cover"
          draggable={false}
        />
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <h3 className="line-clamp-2 font-display text-[clamp(1rem,1.25vw,1.2rem)] font-bold leading-tight text-slate-950">
          {candidateName}
        </h3>
        <p className="mx-auto mt-2 line-clamp-3 max-w-[16rem] text-[clamp(0.78rem,0.9vw,0.9rem)] leading-5 text-slate-500">
          {candidateDescription}
        </p>
      </div>

      <button
        type="button"
        data-ocid="candidate.select_button"
        onClick={() => {
          if (candidateId) onSelect(candidateId);
        }}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? "Selected: " : "Select "}${candidateName}`}
        className={`mt-4 min-h-11 w-full rounded-xl px-4 text-sm font-bold tracking-wide text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          isSelected
            ? "bg-blue-700 shadow-blue-700/25"
            : "bg-blue-600 shadow-blue-600/25 hover:bg-blue-700"
        }`}
      >
        {isSelected ? "Voted" : "Vote"}
      </button>
    </article>
  );
});
