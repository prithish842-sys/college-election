import { memo } from "react";
import { KioskVotingDashboard } from "./KioskVotingDashboard";

interface SharedVotingUIProps {
  mode: "kiosk" | "mobile";
  onSessionComplete: () => void;
  studentId?: string;
  kioskId?: string;
}

export const SharedVotingUI = memo(function SharedVotingUI({
  mode,
  onSessionComplete,
  studentId,
  kioskId,
}: SharedVotingUIProps) {
  return (
    <KioskVotingDashboard
      mode={mode}
      studentId={studentId}
      kioskId={kioskId}
      onSessionComplete={onSessionComplete}
    />
  );
});
