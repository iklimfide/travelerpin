import type { SupabaseClient } from "@supabase/supabase-js";
import { maxPinPhotosForUsername } from "@/lib/utils/pin-photo-limits";
import {
  resolvePinMediaFields,
  type PinMediaInput,
} from "@/lib/utils/pin-media";

export function countPinPhotoInput(data: PinMediaInput): number {
  const urls = (data.photo_urls ?? []).map((url) => url.trim()).filter(Boolean);
  if (urls.length > 0) return urls.length;
  return data.photo_url?.trim() ? 1 : 0;
}

export async function resolvePinMediaForUser(
  supabase: SupabaseClient,
  userId: string,
  data: PinMediaInput
): Promise<
  | { ok: true; media: Awaited<ReturnType<typeof resolvePinMediaFields>>; maxPhotos: number }
  | { ok: false; error: string }
> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const maxPhotos = maxPinPhotosForUsername(profile?.username);
  const photoCount = countPinPhotoInput(data);
  if (photoCount > maxPhotos) {
    return { ok: false, error: `At most ${maxPhotos} photos allowed` };
  }

  const media = await resolvePinMediaFields(data, { maxPhotos });
  return { ok: true, media, maxPhotos };
}
