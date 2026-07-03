import type { ParkBatchInput } from "@/lib/validations/park";
import type { ParkInput } from "@/lib/validations/park";
import { offerShareAfterPin } from "@/lib/client/share-pin-prompt";

function parkPinKind(
  parkType: ParkInput["park_type"]
): "national_park" | "theme_park" | "park" {
  if (parkType === "national_park") return "national_park";
  if (parkType === "theme_park") return "theme_park";
  return "park";
}

export async function addPark(
  payload: Pick<ParkInput, "park_name" | "park_type" | "country_code" | "country_name"> &
    Partial<Pick<ParkInput, "latitude" | "longitude" | "note" | "media_type" | "media_url">>
): Promise<{ ok: true; park: unknown } | { ok: false; error: string }> {
  const res = await fetch("/api/parks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add park" };
  }

  offerShareAfterPin({
    kind: parkPinKind(payload.park_type),
    name: payload.park_name,
  });
  return { ok: true, park: await res.json() };
}

export async function addParksBatch(
  payload: ParkBatchInput
): Promise<
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/parks/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add parks" };
  }

  const data = await res.json();
  const added = (data.added as number) ?? 0;
  if (added > 0) {
    const first = payload.parks[0];
    offerShareAfterPin(
      added === 1 && first
        ? { kind: parkPinKind(first.park_type), name: first.park_name }
        : { kind: "places", name: "places" }
    );
  }
  return {
    ok: true,
    added,
    skipped: (data.skipped as number) ?? 0,
  };
}
