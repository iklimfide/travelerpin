"use client";

import { useEffect } from "react";

/**
 * Root-layout failures cannot reuse app/error.tsx. Keep a minimal escape hatch
 * so visitors are never stuck on a blank/dead error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#0f172a",
        }}
      >
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, color: "#475569", lineHeight: 1.5 }}>
            You can keep browsing the site.
          </p>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                background: "#2563eb",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
                padding: "10px 20px",
              }}
            >
              Continue to site
            </a>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#334155",
                fontWeight: 600,
                fontSize: 14,
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
