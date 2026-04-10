import { type MouseEvent, useEffect, useRef, useState } from "react";

import { getClassicPortfolioUrl } from "@/lib/site-config";

const SWITCH_TRAVEL_MS = 640;

export default function NormalPeopleSwitch() {
  const classicPortfolioUrl = getClassicPortfolioUrl();
  const [isSwitching, setIsSwitching] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const launchSwitch = () => {
    // Let the projectile animation finish before we swap surfaces.
    setIsSwitching(true);
    timeoutRef.current = window.setTimeout(() => {
      window.location.href = classicPortfolioUrl;
    }, SWITCH_TRAVEL_MS);
  };

  const handleSwitch = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isSwitching) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    launchSwitch();
  };

  return (
    <aside
      className={`site-mode-toggle site-mode-toggle--carob${isSwitching ? " is-launching" : ""}`}
      aria-label="Switch website mode"
    >
      <a
        className={`site-mode-toggle__track${isSwitching ? " is-switching" : ""}`}
        href={classicPortfolioUrl}
        onClick={handleSwitch}
      >
        <span className="site-mode-toggle__thumb" aria-hidden="true" />
        <span className="site-mode-toggle__option site-mode-toggle__option--active">
          <strong>Carob People</strong>
          <small>the experimental version</small>
        </span>
        <span className="site-mode-toggle__option site-mode-toggle__option--target">
          <strong>Mango People</strong>
          <small>the clearer version</small>
        </span>
        <span className="site-mode-toggle__icon" aria-hidden="true">
          ↗
        </span>
      </a>
    </aside>
  );
}
