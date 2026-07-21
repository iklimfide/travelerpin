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
      <div className="profile-owner-section profile-next-route-box">
        <div className="profile-owner-section__header profile-next-route-box__header">
          <div className="profile-next-route-box__header-side">
            <span className="profile-next-route-box__header-spacer" aria-hidden />
          </div>
          <div className="profile-owner-section__intro profile-next-route-box__intro">
            <Skeleton className="profile-next-route-skeleton-title" />
            <Skeleton className="profile-next-route-skeleton-count" />
          </div>
          <div className="profile-next-route-box__header-side profile-next-route-box__header-side--end">
            <div className="profile-next-route-box__header-actions">
              <Skeleton className="profile-next-route-skeleton-btn profile-next-route-skeleton-btn--sort" />
              <Skeleton className="profile-next-route-skeleton-btn profile-next-route-skeleton-btn--add" />
            </div>
          </div>
        </div>

        <ul className="profile-next-route-list profile-next-route-list--skeleton">
          {Array.from({ length: rows }).map((_, index) => (
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
    </section>
  );
}
