"use client";

import { useEffect, useState } from "react";

type ProgressiveRevealOptions = {
  initial?: number;
  step?: number;
  delayMs?: number;
  enabled?: boolean;
};

/** Gradually reveal list items after the full payload arrives. */
export function useProgressiveReveal<T>(
  items: readonly T[],
  options?: ProgressiveRevealOptions
): T[] {
  const { initial = 5, step = 5, delayMs = 70, enabled = true } = options ?? {};
  const [visibleCount, setVisibleCount] = useState(() =>
    enabled ? Math.min(initial, items.length) : items.length
  );

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(items.length);
      return;
    }
    setVisibleCount(Math.min(initial, items.length));
  }, [enabled, initial, items]);

  useEffect(() => {
    if (!enabled || visibleCount >= items.length) return;

    const id = window.setTimeout(() => {
      setVisibleCount((current) => Math.min(items.length, current + step));
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [delayMs, enabled, items.length, step, visibleCount]);

  return items.slice(0, visibleCount);
}
