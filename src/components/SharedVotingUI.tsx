import { memo } from "react";
import { KioskVotingDashboard } from "./KioskVotingDashboard";

interface SharedVotingUIProps {
  mode: "kiosk" | "mobile";
  onSessionComplete: () => void;
  studentId?: string;
}

export const SharedVotingUI = memo(function SharedVotingUI({
  mode,
  onSessionComplete,
  studentId,
}: SharedVotingUIProps) {
  return (
    <KioskVotingDashboard
      mode={mode}
      studentId={studentId}
      onSessionComplete={onSessionComplete}
    />
  );
});
