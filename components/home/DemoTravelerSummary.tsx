"use client";

import { Link } from "@/lib/i18n/navigation";
import { formatMessage, homeMessages, useAppMessages } from "@/lib/i18n/client-messages";
import type { TravelStats } from "@/types/database";

type DemoTravelerSummaryProps = {
  name: string;
  stats: TravelStats;
};

export function DemoTravelerStatsCompact({
  stats,
  className = "",
}: {
  stats: TravelStats;
  className?: string;
}) {
  const { common: commonMessages } = useAppMessages();
  return (
    <div className={`flex shrink-0 flex-col items-end gap-1 text-right ${className}`}>
      <p className="leading-tight">
        <span className="text-xl font-bold text-foreground">{stats.countries}</span>{" "}
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
          {commonMessages.countries}
        </span>
      </p>
      <p className="leading-tight">
        <span className="text-xl font-bold text-foreground">{stats.cities}</span>{" "}
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
          {commonMessages.cities}
        </span>
      </p>
    </div>
  );
}

export function DemoTravelerStory({ name, stats }: DemoTravelerSummaryProps) {
  const story = formatMessage(homeMessages.demoTravelerStory, {
    name,
    countries: stats.countries,
    cities: stats.cities,
  });

  return (
    <p className="text-center text-sm leading-relaxed text-slate-400 sm:text-right">
      {story}{" "}
      <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300">
        {homeMessages.createYourMap}
      </Link>
    </p>
  );
}

/** Desktop: stats pill + story (right column). */
export function DemoTravelerSummaryDesktop({ name, stats }: DemoTravelerSummaryProps) {
  const { common: commonMessages } = useAppMessages();

  return (
    <div className="hidden flex-col gap-3 sm:flex sm:max-w-md sm:items-end">
      <div className="inline-flex items-center gap-3 rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-lg font-semibold tracking-wide text-blue-800 dark:text-blue-100">
        <span>
          <span className="text-2xl font-bold text-foreground">{stats.countries}</span>{" "}
          <span className="text-sm font-medium text-blue-700 dark:text-blue-200">
            {commonMessages.countries}
          </span>
        </span>
        <span className="text-blue-500/60 dark:text-blue-400/60">|</span>
        <span>
          <span className="text-2xl font-bold text-foreground">{stats.cities}</span>{" "}
          <span className="text-sm font-medium text-blue-700 dark:text-blue-200">
            {commonMessages.cities}
          </span>
        </span>
      </div>
      <DemoTravelerStory name={name} stats={stats} />
    </div>
  );
}
