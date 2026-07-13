import { Skeleton } from "@/components/ui/Skeleton";
import { saveDestinationMessages } from "@/lib/i18n/client-messages";

type SaveDestinationModalListSkeletonProps = {
  rows?: number;
  variant?: "browse" | "route";
};

function SaveDestinationModalRowSkeleton({ variant = "browse" }: { variant?: "browse" | "route" }) {
  return (
    <li className="save-destination-modal__item">
      <div className="save-destination-modal__row save-destination-modal__row--skeleton">
        <Skeleton className="save-destination-skeleton-flag" />
        <div className="save-destination-modal__text">
          <Skeleton className="save-destination-skeleton-line save-destination-skeleton-line--title" />
          <Skeleton className="save-destination-skeleton-line save-destination-skeleton-line--meta" />
        </div>
        {variant === "route" ? (
          <div className="save-destination-modal__row-actions save-destination-modal__row-actions--skeleton">
            <Skeleton className="save-destination-skeleton-mini-btn" />
            <Skeleton className="save-destination-skeleton-mini-btn" />
            <Skeleton className="save-destination-skeleton-check" />
          </div>
        ) : (
          <Skeleton className="save-destination-skeleton-check" />
        )}
      </div>
    </li>
  );
}

export function SaveDestinationModalListSkeleton({
  rows = 8,
  variant = "browse",
}: SaveDestinationModalListSkeletonProps) {
  return (
    <ul
      className="save-destination-modal__list save-destination-modal__list--skeleton scrollbar-thin"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={saveDestinationMessages.loading}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <SaveDestinationModalRowSkeleton key={index} variant={variant} />
      ))}
    </ul>
  );
}

export function SaveDestinationModalStatusSkeleton() {
  return <Skeleton className="save-destination-skeleton-status" />;
}
