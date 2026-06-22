import type { Position } from "@/types/election";

interface ProgressIndicatorProps {
  currentPositionIndex: number;
  totalPositions: number;
  currentPosition: Position;
}

export function ProgressIndicator({
  currentPositionIndex,
  totalPositions,
  currentPosition,
}: ProgressIndicatorProps) {
  const step = currentPositionIndex + 1;
  const percent = (step / totalPositions) * 100;

  return (
    <div
      data-ocid="progress.panel"
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background:
          "linear-gradient(135deg, rgba(10,14,26,0.95) 0%, rgba(13,22,51,0.95) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(37,99,235,0.25)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xl">{currentPosition.icon}</span>
            <div>
              <p
                className="text-foreground font-display font-semibold text-sm sm:text-base leading-tight"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                {currentPosition.title}
              </p>
              <p className="text-muted-foreground text-xs hidden sm:block">
                {currentPosition.description.slice(0, 60)}…
              </p>
            </div>
          </div>
          <div
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold tracking-widest"
            style={{
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(30,74,138,0.4) 100%)",
              border: "1px solid rgba(37,99,235,0.5)",
              color: "#93c5fd",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            STEP {step} / {totalPositions}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="relative h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(37,99,235,0.15)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${percent}%`,
              background:
                "linear-gradient(90deg, #1e4a8a 0%, #2563eb 60%, #60a5fa 100%)",
              boxShadow: "0 0 12px rgba(37,99,235,0.7)",
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
