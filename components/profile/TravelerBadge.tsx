"use client";

import {
  BADGE_TIER_THEMES,
  getTravelerBadgeTier,
  type TravelerBadgeTier,
} from "@/lib/utils/traveler-badge";
import { translateBadge } from "@/lib/i18n/client-messages";

function BadgeIcon({ tier, className }: { tier: TravelerBadgeTier; className: string }) {
  const props = {
    className,
    width: 10,
    height: 10,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (tier) {
    case "explorer":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <path d="m8 8 8 8M16 8l-8 8" opacity={0.5} />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "globetrotter":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "super_voyager":
      return (
        <svg {...props}>
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
        </svg>
      );
    case "world_citizen":
      return (
        <svg {...props}>
          <path d="M5 18h14" />
          <path d="M7 18 8.5 9l3.5 4 3.5-4L18 18" />
          <path d="M9.5 9 12 5l2.5 4" />
        </svg>
      );
  }
}

type TravelerBadgeProps = {
  countryCount: number;
  className?: string;
};

export function TravelerBadge({ countryCount, className = "" }: TravelerBadgeProps) {
  const tier = getTravelerBadgeTier(countryCount);
  if (!tier) return null;

  const t = translateBadge;
  const theme = BADGE_TIER_THEMES[tier];

  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium leading-tight tracking-normal text-inherit sm:text-[10px] ${theme.shell} ${className}`}
    >
      <BadgeIcon tier={tier} className={`h-2.5 w-2.5 shrink-0 ${theme.icon}`} />
      {t(tier)}
    </span>
  );
}
