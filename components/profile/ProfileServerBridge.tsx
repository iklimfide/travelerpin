"use client";

import { useEffect } from "react";
import {
  writeProfileCache,
} from "@/lib/client/session-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";

type Props = {
  username: string;
  /** First paint payload — optional when travel data loads progressively on the client. */
  initialData?: PublicProfilePageData;
};

/**
 * Seeds the session profile cache from SSR when a full payload is available.
 * Live pin updates are handled client-side (progressive loader + travel-state events).
 */
export function ProfileServerBridge({ username, initialData }: Props) {
  const normalized = username.trim().toLowerCase();

  useEffect(() => {
    if (!initialData) return;
    writeProfileCache(normalized, initialData);
  }, [initialData, normalized]);

  return null;
}
