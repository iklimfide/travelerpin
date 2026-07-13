import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export function ProfilePageSkeleton() {
  return (
    <SkeletonScreen label="Loading profile">
      <div className="profile-page profile-page--route">
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

              <div className="profile-map-panel mt-4">
                <Skeleton className="h-[220px] w-full rounded-[20px]" />
              </div>
            </div>
          </div>

          <main className="profile-main space-y-4">
            <div className="profile-owner-section profile-next-route-box">
              <div className="profile-owner-section__header profile-next-route-box__header">
                <div className="profile-next-route-box__header-side">
                  <Skeleton className="profile-next-route-skeleton-btn" />
                </div>
                <div className="profile-owner-section__intro profile-next-route-box__intro">
                  <Skeleton className="profile-next-route-skeleton-title" />
                  <Skeleton className="profile-next-route-skeleton-count" />
                </div>
                <div className="profile-next-route-box__header-side profile-next-route-box__header-side--end">
                  <Skeleton className="profile-next-route-skeleton-btn profile-next-route-skeleton-btn--add" />
                </div>
              </div>
              <ul className="profile-next-route-list profile-next-route-list--skeleton">
                {Array.from({ length: 3 }).map((_, index) => (
                  <li key={index} className="profile-next-route-item profile-next-route-item--skeleton">
                    <div className="profile-next-route-row">
                      <Skeleton className="profile-next-route-skeleton-index" />
                      <Skeleton className="profile-next-route-skeleton-flag" />
                      <div className="profile-next-route-text">
                        <Skeleton className="profile-next-route-skeleton-line profile-next-route-skeleton-line--title" />
                        <Skeleton className="profile-next-route-skeleton-line profile-next-route-skeleton-line--meta" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="profile-cards-row">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-[168px] min-w-[220px] flex-1 rounded-[24px]" />
              ))}
            </div>
          </main>
        </div>
      </div>
    </SkeletonScreen>
  );
}
