"use client";

import { useId } from "react";

type InstagramBrandIconProps = {
  className?: string;
};

/** Instagram camera glyph in official orange–pink–purple gradient. */
export function InstagramBrandIcon({ className }: InstagramBrandIconProps) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <defs>
        <linearGradient
          id={gradientId}
          x1="3"
          y1="21"
          x2="21"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill={`url(#${gradientId})`} />
    </svg>
  );
}
