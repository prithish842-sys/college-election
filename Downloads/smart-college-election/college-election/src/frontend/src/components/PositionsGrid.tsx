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
} from "lucide-react";
import { motion } from "motion/react";

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

interface PositionsGridProps {
  positions: Position[];
  votes: Vote;
  onPositionClick: (id: string) => void;
}

export function PositionsGrid({
  positions,
  votes,
  onPositionClick,
}: PositionsGridProps) {
  return (
    <section
      data-ocid="positions.section"
      className="px-4 py-12 sm:px-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="mb-10 text-center"
      >
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Election Positions
        </h2>
        <p className="mt-3 font-body text-muted-foreground">
          Select a position to view candidates and cast your vote
        </p>
      </motion.div>

      <div
        data-ocid="positions.list"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {positions.map((position, index) => {
          const Icon = POSITION_ICONS[position.id] ?? Crown;
          const isVoted = !!votes[position.id];

          return (
            <motion.button
              key={position.id}
              data-ocid={`positions.item.${index + 1}`}
              type="button"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.08,
                ease: [0.4, 0, 0.2, 1],
              }}
              whileHover={{
                y: -4,
                scale: 1.02,
                transition: { duration: 0.25 },
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPositionClick(position.id)}
              className="group relative flex cursor-pointer flex-col items-start gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 text-left shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-white/10 hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Subtle top gradient accent */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/20">
                <Icon className="h-6 w-6 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-foreground">
                  {position.title}
                </h3>
                <p className="mt-1 line-clamp-3 font-body text-xs leading-relaxed text-muted-foreground">
                  {position.description}
                </p>
              </div>

              {/* Voted badge */}
              {isVoted && (
                <div
                  data-ocid={`positions.voted_badge.${index + 1}`}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Voted
                </div>
              )}

              {/* Bottom glow on hover */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
