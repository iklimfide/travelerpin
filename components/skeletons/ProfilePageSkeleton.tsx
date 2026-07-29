import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { ProfileMainProgressiveSkeleton } from "@/components/skeletons/ProfileMainProgressiveSkeleton";
import { ProfileMapPanelSkeleton } from "@/components/skeletons/ProfileMapPanelSkeleton";

export function ProfilePageSkeleton() {
  return (
    <SkeletonScreen label="Loading profile">
      <div className="profile-page profile-page--route min-h-[70dvh]">
        <div className="profile-shell">
          <div className="profile-story-capture">
            <div className="profile-hero-card">
              <Skeleton className="!absolute inset-0 !rounded-none !bg-[#d8e4f2]" />
              <div className="relative z-[2] space-y-3">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-7 w-48 max-w-[70%]" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>

            <div className="profile-main">
              <section className="profile-card">
                <div className="profile-avatar-shell">
                  <Skeleton className="!h-[104px] !w-[104px] !rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="mx-auto h-7 w-40" />
                  <Skeleton className="mx-auto h-4 w-24" />
                </div>
                <div className="mt-5 flex justify-center gap-3">
                  <Skeleton className="h-10 w-24 rounded-full" />
                  <Skeleton className="h-10 w-24 rounded-full" />
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 rounded-2xl" />
                  ))}
                </div>
              </section>

              <ProfileMapPanelSkeleton />
            </div>
          </div>

          <main className="profile-main space-y-4">
            <ProfileMainProgressiveSkeleton showTravelUpdate showNextRoute />
          </main>
        </div>
      </div>
    </SkeletonScreen>
  );
}
