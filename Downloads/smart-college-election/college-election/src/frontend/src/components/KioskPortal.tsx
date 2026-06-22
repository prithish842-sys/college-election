import { memo, useCallback, useState } from "react";
import { HomePage } from "./HomePage";
import { SharedVotingUI } from "./SharedVotingUI";

type KioskViewState = "home" | "voting";

export const KioskPortal = memo(function KioskPortal() {
  const [viewState, setViewState] = useState<KioskViewState>("home");

  const enterPortal = useCallback(() => setViewState("voting"), []);
  const resetToHome = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setViewState("home");
  }, []);

  if (viewState === "home") {
    return <HomePage onStartVoting={enterPortal} />;
  }

  return <SharedVotingUI mode="kiosk" onSessionComplete={resetToHome} />;
});
