"use client";

import { useEffect, useState } from "react";

export const DESKTOP_DASHBOARD_NAV_QUERY = "(min-width: 1024px)";

export function useIsDesktopDashboardNav() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_DASHBOARD_NAV_QUERY);
    const sync = () => setIsDesktop(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}
