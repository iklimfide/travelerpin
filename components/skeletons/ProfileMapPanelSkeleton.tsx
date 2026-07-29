import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileMiniMapSkeleton() {
  return (
    <>
      <div className="profile-mini-map" aria-hidden="true">
        <Skeleton className="!block !h-auto !w-full !rounded-none aspect-[800/450]" />
        <div className="profile-map-badge" aria-hidden="true">
          <Skeleton className="!mx-auto !h-7 !w-12 !rounded-md" />
          <Skeleton className="!mx-auto !mt-1 !h-3 !w-16 !rounded-md" />
        </div>
      </div>
      <Skeleton className="!mx-4 !mb-3 !mt-0 !h-10 !w-[calc(100%-2rem)] !rounded-xl border-t border-[#d8e1ef] !pt-3" />
    </>
  );
}

export function ProfileMapPanelSkeleton() {
  return (
    <section
      id="profile-map"
      className="profile-section"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading map"
    >
      <div className="profile-map-panel">
        <ProfileMiniMapSkeleton />
      </div>
    </section>
  );
}
