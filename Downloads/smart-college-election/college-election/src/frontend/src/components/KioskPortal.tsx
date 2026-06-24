import { memo, useCallback, useState } from "react";
import { SharedVotingUI } from "./SharedVotingUI";

export const KioskPortal = memo(function KioskPortal() {
  const [sessionKey, setSessionKey] = useState(0);

  const startNextSession = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setSessionKey((currentKey) => currentKey + 1);
  }, []);

  return (
    <SharedVotingUI
      key={sessionKey}
      mode="kiosk"
      onSessionComplete={startNextSession}
    />
  );
});
