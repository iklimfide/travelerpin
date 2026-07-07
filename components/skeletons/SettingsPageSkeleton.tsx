import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export function SettingsPageSkeleton() {
  return (
    <SkeletonScreen label="Loading settings">
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </section>

          {Array.from({ length: 5 }).map((_, index) => (
            <section key={index} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </section>
          ))}

          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        <div className="mt-8">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </main>
    </SkeletonScreen>
  );
}
