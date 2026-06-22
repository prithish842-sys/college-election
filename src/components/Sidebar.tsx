import type { Position, Vote } from "@/types/election";
import {
  CheckCircle2,
  Code2,
  Crown,
  DollarSign,
  FileText,
  Music,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const POSITION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  chairman: Crown,
  "vice-chairman": Star,
  secretary: FileText,
  treasurer: DollarSign,
  "sports-head": Trophy,
  "cultural-head": Music,
  "technical-lead": Code2,
  "class-representative": Users,
};

interface SidebarProps {
  isOpen: boolean;
  positions: Position[];
  currentPositionId: string;
  votes: Vote;
  onPositionSelect: (id: string) => void;
  onClose: () => void;
}

export function Sidebar({
  isOpen,
  positions,
  currentPositionId,
  votes,
  onPositionSelect,
  onClose,
}: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sidebar-backdrop"
            data-ocid="sidebar.backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar panel */}
          <motion.aside
            key="sidebar-panel"
            data-ocid="sidebar.panel"
            aria-modal="true"
            aria-label="Election positions"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-white/10 shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg, #0a0e1a 0%, #0d1633 40%, #102040 100%)",
            }}
          >
            {/* Subtle glass sheen */}
            <div className="pointer-events-none absolute inset-0 rounded-r-none bg-white/[0.03]" />

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="font-display text-lg font-bold tracking-wide text-foreground">
                  Election 2024
                </h2>
                <p className="mt-0.5 font-body text-xs text-muted-foreground">
                  {Object.keys(votes).length} of {positions.length} voted
                </p>
              </div>
              <button
                type="button"
                data-ocid="sidebar.close_button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="relative h-1 w-full bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-primary/70 to-primary"
                initial={{ width: 0 }}
                animate={{
                  width: `${(Object.keys(votes).length / positions.length) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>

            {/* Positions list */}
            <nav className="relative flex-1 overflow-y-auto py-3">
              <ul data-ocid="sidebar.positions_list" className="space-y-1 px-3">
                {positions.map((position, index) => {
                  const Icon = POSITION_ICONS[position.id] ?? Crown;
                  const isActive = position.id === currentPositionId;
                  const isVoted = !!votes[position.id];

                  return (
                    <li key={position.id}>
                      <button
                        type="button"
                        data-ocid={`sidebar.position_item.${index + 1}`}
                        onClick={() => onPositionSelect(position.id)}
                        className={[
                          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isActive
                            ? "border-l-2 border-primary bg-primary/15 text-foreground"
                            : "border-l-2 border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
                        ].join(" ")}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {/* Icon */}
                        <div
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                            isActive
                              ? "bg-primary/20 text-primary"
                              : "bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Label */}
                        <span className="flex-1 font-body text-sm font-medium leading-tight">
                          {position.title}
                        </span>

                        {/* Voted checkmark */}
                        {isVoted && (
                          <CheckCircle2
                            data-ocid={`sidebar.voted_check.${index + 1}`}
                            className="h-4 w-4 shrink-0 text-emerald-400"
                            aria-label="Voted"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer hint */}
            <div className="relative border-t border-white/10 px-6 py-4">
              <p className="font-body text-xs leading-relaxed text-muted-foreground">
                Click any position to view candidates and cast your vote.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
