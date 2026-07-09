"use client";

import { usePathname } from "next/navigation";
import { OwnProfileInstantView } from "@/components/profile/OwnProfileInstantView";
import { useOwnProfileCacheHit } from "@/components/profile/OwnProfileDataProvider";
import { ProfilePageSkeleton } from "@/components/skeletons/ProfilePageSkeleton";

/**
 * Own profile + warm client cache → paint cached UI instantly (no skeleton).
 * Other profiles keep the full-page skeleton while the RSC segment loads.
 */
export default function ProfileLoading() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? null;
  const ownCacheHit = useOwnProfileCacheHit(segment);

  if (ownCacheHit) return <OwnProfileInstantView />;

  return <ProfilePageSkeleton />;
}
