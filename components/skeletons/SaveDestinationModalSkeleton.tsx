import { Skeleton } from "@/components/ui/Skeleton";
import { saveDestinationMessages } from "@/lib/i18n/client-messages";

function SaveDestinationModalRowSkeleton() {
  return (
    <li className="save-destination-modal__item">
      <div className="save-destination-modal__row save-destination-modal__row--skeleton">
        <Skeleton className="!h-8 !w-8 shrink-0 !rounded-full" />
        <div className="save-destination-modal__text">
          <Skeleton className="h-4 w-[58%] max-w-[220px]" />
          <Skeleton className="mt-1.5 h-3 w-[38%] max-w-[140px]" />
        </div>
        <Skeleton className="!h-7 !w-7 shrink-0 !rounded-full" />
      </div>
    </li>
  );
}

export function SaveDestinationModalListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul
      className="save-destination-modal__list scrollbar-thin"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={saveDestinationMessages.loading}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <SaveDestinationModalRowSkeleton key={index} />
      ))}
    </ul>
  );
}

export function SaveDestinationModalStatusSkeleton() {
  return <Skeleton className="ml-auto h-3.5 w-44 max-w-full" />;
}
