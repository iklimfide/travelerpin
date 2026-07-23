import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileNextRouteSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section
      className="profile-section profile-next-route"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading next route"
    >
      <div className="profile-next-route-box">
        <div className="profile-next-route-box__hero profile-card-hero">
          <div className="profile-next-route-box__header">
            <div className="profile-next-route-box__header-action profile-next-route-box__header-action--start">
              <Skeleton className="profile-next-route-skeleton-btn profile-next-route-skeleton-btn--sort" />
            </div>
            <div className="profile-next-route-box__intro">
              <Skeleton className="profile-next-route-skeleton-title" />
              <Skeleton className="profile-next-route-skeleton-count" />
            </div>
            <div className="profile-next-route-box__header-action profile-next-route-box__header-action--end">
              <Skeleton className="profile-next-route-skeleton-btn profile-next-route-skeleton-btn--add" />
            </div>
          </div>
        </div>

        <div className="profile-next-route-box__body">
          <ol className="profile-next-route-timeline profile-next-route-timeline--skeleton">
            {Array.from({ length: rows }).map((_, index) => (
              <li key={index} className="profile-next-route-timeline-item profile-next-route-timeline-item--skeleton">
                <Skeleton className="profile-next-route-skeleton-node" />
                <div className="profile-next-route-card profile-next-route-card--skeleton">
                  <Skeleton className="profile-next-route-skeleton-flag" />
                  <div className="profile-next-route-text">
                    <Skeleton className="profile-next-route-skeleton-line profile-next-route-skeleton-line--title" />
                    <Skeleton className="profile-next-route-skeleton-line profile-next-route-skeleton-line--meta" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
