import { Skeleton } from "@/components/ui/Skeleton";
import { ProfileNextRouteSectionSkeleton } from "@/components/skeletons/ProfileNextRouteSectionSkeleton";

type ProfileMainProgressiveSkeletonProps = {
  showTravelUpdate?: boolean;
  showNextRoute?: boolean;
};

export function ProfileMainProgressiveSkeleton({
  showTravelUpdate = false,
  showNextRoute = false,
}: ProfileMainProgressiveSkeletonProps) {
  return (
    <div className="profile-main-progressive-skeleton space-y-4" aria-busy="true" aria-live="polite">
      {showTravelUpdate ? (
        <section className="profile-section">
          <Skeleton className="h-[132px] w-full rounded-[24px]" />
        </section>
      ) : null}

      <div className="profile-cards-row">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[168px] min-w-[220px] flex-1 rounded-[24px]" />
        ))}
      </div>

      {showNextRoute ? <ProfileNextRouteSectionSkeleton rows={3} /> : null}
    </div>
  );
}
