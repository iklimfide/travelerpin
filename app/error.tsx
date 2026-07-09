"use client";

import { useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Soft recovery UI: never trap the visitor on a dead-end error screen.
 * Clears a broken auth session (cookie chaos) and offers a path back into the site.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);

    // Corrupt / conflicting auth cookies often surface as opaque RSC failures.
    // Clear the session so the next navigation loads as a guest.
    try {
      const supabase = createClient();
      void supabase.auth.signOut().catch(() => {
        // ignore
      });
    } catch {
      // ignore — env may be missing in edge cases
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        You can keep browsing. If you were signed in, try signing in again after continuing.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-blue-500"
        >
          Continue to site
        </Link>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
