"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  getOwnUsername,
  writeProfileCache,
  type ProfileDataStaleDetail,
} from "@/lib/client/session-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";

type Props = {
  username: string;
  /** First paint payload — optional when travel data loads progressively on the client. */
  initialData?: PublicProfilePageData;
  /** Own profile: refresh RSC tree after pin/travel edits. */
  enableLiveRefresh?: boolean;
};

/**
 * Seeds the session profile cache from SSR and (for the owner) refreshes the
 * server tree when travel data changes — without a client-side data waterfall.
 */
export function ProfileServerBridge({
  username,
  initialData,
  enableLiveRefresh = false,
}: Props) {
  const router = useRouter();
  const normalized = username.trim().toLowerCase();

  useEffect(() => {
    if (!initialData) return;
    writeProfileCache(normalized, initialData);
  }, [initialData, normalized]);

  useEffect(() => {
    if (!enableLiveRefresh) return;

    function refreshIfOwn(event: Event) {
      const own = getOwnUsername();
      if (!own || own !== normalized) return;

      if (event.type === PROFILE_DATA_STALE_EVENT) {
        const detail = (event as CustomEvent<ProfileDataStaleDetail>).detail;
        const target = detail?.username ?? own;
        if (target !== normalized) return;
      }

      router.refresh();
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, refreshIfOwn);
    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, refreshIfOwn);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, refreshIfOwn);
      window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, refreshIfOwn);
    };
  }, [enableLiveRefresh, normalized, router]);

  return null;
}
