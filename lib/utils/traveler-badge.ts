export type TravelerBadgeTier =
  | "explorer"
  | "globetrotter"
  | "super_voyager"
  | "world_citizen";

export type BadgeTierTheme = {
  /** Tailwind classes for the badge shell */
  shell: string;
  /** Icon stroke/fill color class */
  icon: string;
  /** Inner icon circle */
  iconRing: string;
};

export const TRAVELER_BADGE_LABELS: Record<TravelerBadgeTier, string> = {
  explorer: "Explorer",
  globetrotter: "Globetrotter",
  super_voyager: "Super Voyager",
  world_citizen: "World Citizen",
};

export function getTravelerBadgeLabel(countryCount: number): string | null {
  const tier = getTravelerBadgeTier(countryCount);
  return tier ? TRAVELER_BADGE_LABELS[tier] : null;
}

/** Visited country count → badge tier (1-based thresholds per product spec). */
export function getTravelerBadgeTier(
  countryCount: number
): TravelerBadgeTier | null {
  if (countryCount < 1) return null;
  if (countryCount <= 4) return "explorer";
  if (countryCount <= 14) return "globetrotter";
  if (countryCount <= 29) return "super_voyager";
  return "world_citizen";
}

/** Per-tier colors — progression from explorer to navy-and-gold world citizen. */
export const BADGE_TIER_THEMES: Record<TravelerBadgeTier, BadgeTierTheme> = {
  explorer: {
    shell:
      "border-emerald-600/45 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500/45 dark:bg-emerald-500/12 dark:text-emerald-100 dark:shadow-[0_0_20px_rgba(16,185,129,0.12)]",
    icon: "text-emerald-700 dark:text-emerald-400",
    iconRing: "border-emerald-300/70 bg-emerald-100 dark:border-white/10 dark:bg-black/20",
  },
  globetrotter: {
    shell:
      "border-sky-600/45 bg-sky-50 text-sky-900 shadow-sm dark:border-sky-500/45 dark:bg-sky-500/12 dark:text-sky-100 dark:shadow-[0_0_20px_rgba(14,165,233,0.14)]",
    icon: "text-sky-700 dark:text-sky-400",
    iconRing: "border-sky-300/70 bg-sky-100 dark:border-white/10 dark:bg-black/20",
  },
  super_voyager: {
    shell:
      "border-violet-500/40 bg-violet-50 text-violet-800 dark:border-violet-500/35 dark:bg-violet-500/10 dark:text-violet-200",
    icon: "text-violet-700 dark:text-violet-400",
    iconRing: "border-violet-400/60 bg-violet-200/80 dark:border-white/10 dark:bg-black/20",
  },
  world_citizen: {
    shell: "traveler-badge--world-citizen shadow-sm",
    icon: "traveler-badge--world-citizen-icon",
    iconRing: "traveler-badge--world-citizen-ring",
  },
};
