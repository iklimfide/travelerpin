import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export function ProfileAllPageSkeleton() {
  return (
    <SkeletonScreen label="Loading destinations">
      <div className="profile-page profile-all-page">
        <div className="profile-shell">
          <div className="profile-all-header space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-56" />
          </div>

          <div className="profile-all-map">
            <div className="profile-map-panel">
              <Skeleton className="h-[220px] w-full rounded-[20px] lg:min-h-[360px]" />
            </div>
          </div>

          <main className="profile-all-main space-y-5">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-24 shrink-0 rounded-full" />
              ))}
            </div>

            {Array.from({ length: 2 }).map((_, sectionIndex) => (
              <section key={sectionIndex} className="space-y-3">
                <Skeleton className="h-7 w-40" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 4 }).map((_, cardIndex) => (
                    <Skeleton key={cardIndex} className="h-[132px] w-full rounded-[24px]" />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </SkeletonScreen>
  );
}
