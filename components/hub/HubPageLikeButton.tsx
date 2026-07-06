"use client";

import { useState } from "react";
import { useAuthGate } from "@/components/auth/useAuthGate";
import { tapPressProps } from "@/lib/client/use-instant-action";

type HubPageLikeButtonProps = {
  label: string;
  loginHref: string;
  isLoggedIn: boolean;
  disabled?: boolean;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="city-page__heart"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HubPageLikeButton({
  label,
  loginHref,
  isLoggedIn,
  disabled = false,
}: HubPageLikeButtonProps) {
  const authGate = useAuthGate();
  const [liked, setLiked] = useState(false);

  function handleClick() {
    if (!isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    setLiked((current) => !current);
  }

  return (
    <button
      type="button"
      className={`city-page__btn city-page__btn--like${liked ? " city-page__btn--active" : ""}`}
      disabled={disabled}
      onClick={handleClick}
      {...tapPressProps(disabled)}
      aria-label={label}
      aria-pressed={liked}
    >
      <HeartIcon filled={liked} />
      <span>{label}</span>
    </button>
  );
}
