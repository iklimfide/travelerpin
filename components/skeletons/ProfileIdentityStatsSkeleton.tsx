import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileIdentityStatsSkeleton() {
  return (
    <div className="profile-metrics" aria-busy="true" aria-live="polite">
      <div className="profile-world-progress">
        <div className="profile-world-progress__top">
          <Skeleton className="h-5 w-36 max-w-[70%] rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="mt-2 h-4 w-48 max-w-full rounded-md" />
      </div>
      <div className="profile-stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="profile-stat flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-10 rounded-md" />
            <Skeleton className="h-3 w-12 max-w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
