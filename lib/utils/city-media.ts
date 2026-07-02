import type { PinMediaInput } from "@/lib/utils/pin-media";
import { resolvePinMediaFields } from "@/lib/utils/pin-media";

type CityMediaInput = PinMediaInput;

/** @deprecated Use resolvePinMediaFields from pin-media.ts */
export async function resolveCityMediaFields(data: CityMediaInput) {
  return resolvePinMediaFields(data);
}
