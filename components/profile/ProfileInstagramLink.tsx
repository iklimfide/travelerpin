"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { parseInstagramProfileUrl } from "@/lib/utils/instagram";

function InstagramProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function displayInstagramUsername(url: string): string {
  const username = parseInstagramProfileUrl(url);
  return username ? `@${username}` : url.replace(/\/$/, "");
}

type ProfileInstagramLinkProps = {
  url: string;
  /** When set, click shows this notice instead of opening Instagram. */
  sampleNotice?: string | null;
};

export function ProfileInstagramLink({ url, sampleNotice }: ProfileInstagramLinkProps) {
  const toast = useToast();
  const label = displayInstagramUsername(url);

  if (sampleNotice) {
    return (
      <button
        type="button"
        className="profile-instagram-link"
        data-story-exclude=""
        onClick={() => toast.show(sampleNotice, 2500)}
      >
        <InstagramProfileIcon />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="profile-instagram-link"
      data-story-exclude=""
    >
      <InstagramProfileIcon />
      <span>{label}</span>
    </a>
  );
}
