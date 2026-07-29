"use client";

import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";

export type NotFoundExperienceCopy = {
  stamp: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  explore: string;
  home: string;
  back: string;
};

type NotFoundExperienceProps = {
  copy: NotFoundExperienceCopy;
};

function resolveSearchTarget(rawInput: string): string | null {
  const raw = rawInput.trim().replace(/^@+/, "");
  if (!raw) return null;

  const slug = raw.toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");
  if (/^[a-z0-9_]+$/.test(raw)) {
    return `/${raw.toLowerCase()}`;
  }
  return `/city/${slug}`;
}

function MapPatternIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 576 512" aria-hidden className={className} fill="currentColor">
      <path d="M408 120c0 54.6-73.1 151.9-105.2 192-7.7 9.6-22 9.6-29.6 0C241.1 271.9 168 174.6 168 120 168 53.7 221.7 0 288 0s120 53.7 120 120zm8 80.4c3.5-6.9 6.7-13.8 9.6-20.6.5-1.2 1-2.4 1.5-3.5C445 160.4 472 142.8 472 120c0-44.2-35.8-80-80-80S312 75.8 312 120c0 22.8 27 40.4 46.9 57.3.5 1.1 1 2.2 1.5 3.3 2.9 6.8 6.1 13.7 9.6 20.6V200zM288 360a207 207 0 0 1-72.8-13.2c-2.5-.8-4.9-1.6-7.2-2.5-1.9-.7-3.8-1.4-5.7-2.1C166.5 334.5 96 259.4 96 192c0-3.4.1-6.8.3-10.2.1-1.9.3-3.8.5-5.6.2-1.7.5-3.5.8-5.2 6.9-35.8 29.6-66.6 61.8-86.4 24.4-14.7 52.7-22.6 81.6-22.6s57.2 7.9 81.6 22.6c32.2 19.8 54.9 50.6 61.8 86.4.3 1.7.6 3.5.8 5.2.2 1.8.4 3.7.5 5.6.2 3.4.3 6.8.3 10.2 0 67.4-70.5 142.5-106.3 152.2-1.9.7-3.8 1.4-5.7 2.1-2.3.9-4.7 1.7-7.2 2.5A207 207 0 0 1 288 360zm0 96c-79.5 0-144-64.5-144-144 0-28.9 8.6-56.3 24.6-79.7C125.9 290.8 200 384 288 384s162.1-93.2 182.4-207.7c16 23.4 24.6 50.8 24.6 79.7 0 79.5-64.5 144-144 144zm0-48c52.9 0 96-43.1 96-96s-43.1-96-96-96-96 43.1-96 96 43.1 96 96 96z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" aria-hidden className={className} fill="currentColor">
      <path d="M215.7 499.2C267 435 384 279.4 384 192 384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2 12.3 15.3 35.1 15.3 47.4 0zM192 256a64 64 0 1 0 0-128 64 64 0 1 0 0 128z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={className} fill="currentColor">
      <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0 416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 448 512" aria-hidden className={className} fill="currentColor">
      <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z" />
    </svg>
  );
}

export function NotFoundExperience({ copy }: NotFoundExperienceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = resolveSearchTarget(query);
    if (target) router.push(target);
  }

  return (
    <main className="not-found-page relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-800 dark:bg-[#0f172a] dark:text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.06]"
        aria-hidden
      >
        <MapPatternIcon className="h-[min(40vw,280px)] w-[min(40vw,280px)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-xl text-center">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-xl sm:p-10 dark:border-slate-700 dark:bg-slate-900">
          <div
            className="not-found-stamp pointer-events-none absolute right-4 top-4 select-none rounded-2xl border-4 border-red-600/80 px-3 py-1 font-black text-xs uppercase tracking-widest text-red-600/80 sm:right-6 sm:top-6 sm:px-4 sm:py-1.5 sm:text-sm"
            aria-hidden
          >
            {copy.stamp}
          </div>

          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-100/60 opacity-75 dark:bg-blue-500/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-[#2563eb] to-blue-400 shadow-lg shadow-blue-500/30">
              <PinIcon className="-rotate-12 h-9 w-9 text-white" />
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {copy.title}
          </h1>
          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">
            {copy.description}
          </p>

          <form className="relative mx-auto mb-8 max-w-md" onSubmit={handleSearch}>
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition-all focus-within:border-blue-500 focus-within:bg-white sm:gap-2 sm:p-1.5 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-blue-400 dark:focus-within:bg-slate-950">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-3 sm:h-4 sm:w-4" />
                <input
                  type="search"
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full min-w-0 rounded-xl border-0 bg-transparent py-2 pl-8 pr-1 text-xs leading-snug text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none sm:py-2.5 sm:pl-10 sm:text-sm dark:text-slate-100 dark:focus:bg-slate-950"
                />
              </div>
              <button
                type="submit"
                className="not-found-btn-primary shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-medium leading-none text-white transition-all hover:bg-blue-700 sm:px-4 sm:py-2.5 sm:text-xs"
              >
                {copy.explore}
              </button>
            </div>
          </form>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="not-found-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 sm:w-auto"
            >
              <span>{copy.home}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  router.push("/");
                }
              }}
              className="not-found-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 sm:w-auto"
            >
              <ArrowLeftIcon className="h-4 w-4 shrink-0 text-white" />
              <span>{copy.back}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
