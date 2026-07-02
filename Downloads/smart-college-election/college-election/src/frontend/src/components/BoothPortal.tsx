import { memo, useCallback, useState } from "react";
import { SharedVotingUI } from "./SharedVotingUI";

interface BoothPortalProps {
  boothId?: string;
}

export const BoothPortal = memo(function BoothPortal({
  boothId,
}: BoothPortalProps) {
  const [sessionKey, setSessionKey] = useState(0);

  const startNextSession = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setSessionKey((currentKey) => currentKey + 1);
  }, []);

  return (
    <SharedVotingUI
      key={sessionKey}
      mode="booth"
      boothId={boothId}
      onSessionComplete={startNextSession}
    />
  );
});
