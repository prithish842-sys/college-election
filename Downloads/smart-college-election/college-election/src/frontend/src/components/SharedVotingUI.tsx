import { memo } from "react";
import { BoothVotingDashboard } from "./BoothVotingDashboard";

interface SharedVotingUIProps {
  mode: "booth" | "mobile";
  onSessionComplete: () => void;
  studentId?: string;
  boothId?: string;
}

export const SharedVotingUI = memo(function SharedVotingUI({
  mode,
  onSessionComplete,
  studentId,
  boothId,
}: SharedVotingUIProps) {
  return (
    <BoothVotingDashboard
      mode={mode}
      studentId={studentId}
      boothId={boothId}
      onSessionComplete={onSessionComplete}
    />
  );
});
