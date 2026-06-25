import type { Position, Vote } from "@/types/election";
import { Check, X } from "lucide-react";
import { memo, useMemo } from "react";
import { LogoMark } from "./LogoMark";

interface SidebarMenuProps {
  positions: Position[];
  votes: Vote;
  currentPositionId: string;
  nextUnvotedIndex: number;
  isOpen: boolean;
  persistent?: boolean;
  onClose: () => void;
  onPositionSelect: (id: string) => void;
}

export const SidebarMenu = memo(function SidebarMenu({
  positions,
  votes,
  currentPositionId,
  nextUnvotedIndex,
  isOpen,
  persistent = false,
  onClose,
  onPositionSelect,
}: SidebarMenuProps) {
  const votedCount = useMemo(() => Object.keys(votes).length, [votes]);

  return (
    <>
      {/* Backdrop */}
      {!persistent && (
        <div
          aria-hidden="true"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: "opacity 0.4s ease",
          }}
        />
      )}

      {/* Sidebar panel */}
      <div
        data-ocid="voting.sidebar"
        aria-label="All election positions"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(320px, 90vw)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(180deg, #0a0e1a 0%, #0d1633 50%, #0a0e1a 100%)",
          borderRight: "1px solid rgba(37,99,235,0.3)",
          boxShadow: "8px 0 48px rgba(0,0,0,0.6)",
          transform: persistent
            ? "translateX(0)"
            : isOpen
              ? "translateX(0)"
              : "translateX(-100%)",
          transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(37,99,235,0.2)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <LogoMark size={56} variant="plain" />
            <div className="min-w-0">
              <p
                className="font-bold text-foreground"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "1rem",
                  letterSpacing: "-0.01em",
                }}
              >
                Election Positions
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {votedCount} of {positions.length} voted
              </p>
            </div>
          </div>
          {!persistent && (
            <button
              type="button"
              data-ocid="voting.sidebar_close_button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: "rgba(37,99,235,0.12)",
                border: "1px solid rgba(37,99,235,0.25)",
                color: "#93c5fd",
                transition: "all 0.3s ease",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Position list */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {positions.map((position, index) => {
            const isActive = position.id === currentPositionId;
            const isVoted = !!votes[position.id];
            const isLocked =
              nextUnvotedIndex !== -1 && index > nextUnvotedIndex;
            return (
              <button
                key={position.id}
                type="button"
                data-ocid={`voting.sidebar.item.${index + 1}`}
                onClick={() => onPositionSelect(position.id)}
                disabled={isLocked}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-left"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(30,74,138,0.35) 100%)"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(37,99,235,0.5)"
                    : "1px solid transparent",
                  opacity: isLocked ? 0.45 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                  transition: "all 0.4s ease",
                }}
              >
                <span className="text-lg flex-shrink-0">{position.icon}</span>
                <span
                  className="flex-1 min-w-0 font-medium text-sm truncate"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    color: isActive ? "#93c5fd" : "rgba(226,232,240,0.8)",
                  }}
                >
                  {position.title}
                </span>
                {isVoted && (
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, #1e4a8a 0%, #2563eb 100%)",
                    }}
                  >
                    <Check
                      size={10}
                      strokeWidth={3}
                      style={{ color: "#fff" }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
});
