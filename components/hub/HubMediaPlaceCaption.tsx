import { Link } from "@/lib/i18n/navigation";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";

type HubMediaPlaceCaptionProps = {
  pin: HubTravelerPin;
  className?: string;
};

export function HubMediaPlaceCaption({ pin, className = "" }: HubMediaPlaceCaptionProps) {
  const label = pin.placeLabel?.trim();
  if (!label) return null;

  const placeClass = `city-page__hub-media-place ${className}`.trim();

  if (pin.placePath) {
    return (
      <Link href={pin.placePath} className={placeClass} prefetch={false}>
        {label}
      </Link>
    );
  }

  return <span className={`${placeClass} city-page__hub-media-place--static`}>{label}</span>;
}
