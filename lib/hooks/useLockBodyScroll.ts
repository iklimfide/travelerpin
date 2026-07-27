"use client";

import { useEffect } from "react";

/** Prevent page scroll behind full-screen modals (avoids dimmed content sliding under the backdrop). */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
