"use client";

import { useLayoutEffect, useRef, useState } from "react";

const INITIAL_DURATION_MS = 900;
const SETTLE_DURATION_MS = 450;

function animateCount(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void
): () => void {
  if (from === to) {
    onUpdate(to);
    return () => {};
  }

  const start = performance.now();
  let frameId = 0;

  function tick(now: number) {
    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - (1 - progress) ** 2;
    onUpdate(Math.round(from + (to - from) * eased));
    if (progress < 1) {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  frameId = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(frameId);
}

/**
 * Count-up for progressive profile loads: starts immediately toward placeholder
 * values, then eases to the real total when page data arrives (no snap).
 */
export function useProgressiveStatCount(
  finalValue: number | null,
  placeholderValue: number,
  enabled: boolean
): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    cancelRef.current?.();
    cancelRef.current = null;

    if (!enabled) {
      const value = finalValue ?? 0;
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    const target = finalValue ?? placeholderValue;
    if (target <= 0) {
      displayRef.current = 0;
      setDisplay(0);
      return;
    }

    const from = hasAnimatedRef.current ? displayRef.current : 0;
    const durationMs =
      finalValue === null || !hasAnimatedRef.current
        ? INITIAL_DURATION_MS
        : SETTLE_DURATION_MS;

    hasAnimatedRef.current = true;
    cancelRef.current = animateCount(from, target, durationMs, (value) => {
      displayRef.current = value;
      setDisplay(value);
    });

    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [enabled, finalValue, placeholderValue]);

  return display;
}
