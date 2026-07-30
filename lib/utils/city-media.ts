import { resolvePinMediaFields, type PinMediaInput } from "@/lib/utils/pin-media";

type CityMediaInput = PinMediaInput;

/** @deprecated Use resolvePinMediaFields from pin-media.ts */
export async function resolveCityMediaFields(
  data: CityMediaInput,
  options?: { maxPhotos?: number }
) {
  return resolvePinMediaFields(data, options);
}
