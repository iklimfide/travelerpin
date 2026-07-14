import { ADD_REGION_ORDER } from "@/lib/add/countries-by-region";
import { addDestinationMessages } from "@/lib/i18n/client-messages";
import { Skeleton } from "@/components/ui/Skeleton";

export function AddDestinationCountryPickerSkeleton() {
  return (
    <div
      className="add-destination-step add-destination-step--countries add-destination-step--skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={addDestinationMessages.loading}
    >
      <div className="add-destination-countries-toolbar">
        <Skeleton className="add-destination-skeleton-search" />
      </div>
      <div className="add-destination-countries-scroll">
        <div className="add-destination-countries-scroll__inner">
          <div className="add-destination-region-list add-destination-region-list--skeleton">
            {ADD_REGION_ORDER.map((region) => (
              <div key={region} className="add-destination-region add-destination-region--skeleton">
                <Skeleton className="add-destination-skeleton-region-header" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddDestinationCityListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="add-destination-city-list add-destination-city-list--skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={addDestinationMessages.loading}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="add-destination-city-row add-destination-city-row--skeleton">
          <Skeleton className="add-destination-skeleton-checkbox" />
          <div className="add-destination-city-row__body">
            <Skeleton className="add-destination-skeleton-city-name" />
          </div>
        </div>
      ))}
    </div>
  );
}
