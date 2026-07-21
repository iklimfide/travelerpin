"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Root error boundary for routes outside `[locale]` (e.g. `/kamikaze/*`).
 * Uses plain Next.js links so Turbopack does not pull in `[locale]/error.tsx`
 * for admin pages after hot reloads.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  async function handleReload() {
    if (error.digest) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignore sign-out failures — still attempt a clean reload.
      }
    }
    reset();
  }

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 text-4xl" aria-hidden>
        ⚠️
      </div>
      <h1 className="text-xl font-bold text-slate-900">This page could not load</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {error.digest
          ? "A temporary server error occurred. Try again in a moment."
          : "Something went wrong while loading this page."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void handleReload()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
