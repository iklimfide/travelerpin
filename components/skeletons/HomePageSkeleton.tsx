import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export function HomePageSkeleton() {
  return (
    <SkeletonScreen label="Loading home">
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-[46px] pb-[72px] max-sm:px-3.5 max-sm:py-8 max-sm:pb-[54px] lg:max-w-[1400px] lg:px-10 xl:max-w-[1520px] xl:px-12">
        <div className="grid items-stretch gap-[34px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 xl:gap-12">
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <div className="space-y-4 lg:hidden">
              <Skeleton className="h-12 w-full max-w-xl" />
              <Skeleton className="h-5 w-full max-w-md" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-12 w-36 rounded-full" />
                <Skeleton className="h-12 w-40 rounded-full" />
              </div>
            </div>

            <div className="hidden h-full min-h-0 flex-1 lg:block">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#e2e8f0]/90 bg-white">
                <div className="flex items-center gap-3 border-b border-[#eef2f7] px-5 py-3.5">
                  <div className="flex shrink-0 gap-2">
                    <Skeleton className="!h-3 !w-3 !rounded-full" />
                    <Skeleton className="!h-3 !w-3 !rounded-full" />
                    <Skeleton className="!h-3 !w-3 !rounded-full" />
                  </div>
                  <Skeleton className="mx-auto h-9 w-full max-w-[280px] rounded-[10px]" />
                  <div className="w-[52px] shrink-0" />
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-8 pb-8 pt-8 xl:px-10 xl:pb-10 xl:pt-10">
                  <Skeleton className="mx-auto h-8 w-40" />
                  <Skeleton className="mx-auto mt-4 h-5 w-64 max-w-full" />
                  <div className="mt-8 grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-[96px] w-full rounded-[20px]" />
                    ))}
                  </div>
                  <Skeleton className="mt-8 h-40 w-full rounded-[24px]" />
                </div>
              </div>
            </div>
          </div>

          <div className="profile-page profile-page--embedded">
            <div className="profile-shell">
              <div className="profile-hero-card">
                <Skeleton className="!absolute inset-0 !rounded-none !bg-[#d8e4f2]" />
                <div className="relative z-[2] space-y-3">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-7 w-44 max-w-[70%]" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="profile-main">
                <section className="profile-card">
                  <Skeleton className="mx-auto !h-[92px] !w-[92px] !rounded-full" />
                  <Skeleton className="mx-auto mt-4 h-6 w-36" />
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 rounded-2xl" />
                    ))}
                  </div>
                </section>
                <div className="profile-map-panel mt-4">
                  <Skeleton className="h-[180px] w-full rounded-[20px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SkeletonScreen>
  );
}
