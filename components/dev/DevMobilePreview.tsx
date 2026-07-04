"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "tp-dev-mobile-preview";
const MOBILE_WIDTH = 390;

type Mode = "loading" | "desktop" | "mobile-shell" | "mobile-frame";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

function ToggleButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="dev-mobile-toggle"
      onClick={onClick}
      title={label}
    >
      {label}
    </button>
  );
}

/**
 * Dev-only phone frame in the normal Chrome tab (no DevTools device mode).
 * Outer page hosts a 390px iframe so media queries match a real phone viewport.
 */
export function DevMobilePreview({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      setMode("desktop");
      return;
    }

    const enabled = readEnabled();
    const inIframe = window.self !== window.top;
    if (enabled && !inIframe) setMode("mobile-shell");
    else if (enabled && inIframe) setMode("mobile-frame");
    else setMode("desktop");
  }, []);

  const enterMobile = useCallback(() => {
    writeEnabled(true);
    setMode("mobile-shell");
  }, []);

  const exitMobile = useCallback(() => {
    writeEnabled(false);
    if (window.self !== window.top) {
      try {
        window.parent.location.reload();
      } catch {
        window.location.reload();
      }
      return;
    }
    setMode("desktop");
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return children;
  }

  if (mode === "loading") {
    return children;
  }

  if (mode === "mobile-shell") {
    const src =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : "/";

    return (
      <div className="dev-mobile-shell">
        <div className="dev-mobile-shell__chrome">
          <span className="dev-mobile-shell__label">Mobile · {MOBILE_WIDTH}px</span>
          <button type="button" className="dev-mobile-shell__exit" onClick={exitMobile}>
            Desktop
          </button>
        </div>
        <div
          className="dev-mobile-shell__frame"
          style={{ width: MOBILE_WIDTH }}
        >
          <iframe
            title="Mobile preview"
            src={src}
            className="dev-mobile-shell__iframe"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ToggleButton
        label={mode === "mobile-frame" ? "Desktop" : "Mobile"}
        onClick={mode === "mobile-frame" ? exitMobile : enterMobile}
      />
    </>
  );
}
