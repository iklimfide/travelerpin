import type { CityBatchDeleteInput, CityBatchInput } from "@/lib/validations/city-batch";
import type { CityInput } from "@/lib/validations/city";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { offerShareAfterPin } from "@/lib/client/share-pin-prompt";

export async function addCity(
  payload: Pick<CityInput, "city_name" | "country_code" | "country_name"> &
    Partial<Pick<CityInput, "latitude" | "longitude">>
): Promise<{ ok: true; city: unknown } | { ok: false; error: string }> {
  const res = await fetch("/api/cities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add city" };
  }

  const city = await res.json();
  notifyProfileDataChanged();
  offerShareAfterPin({ kind: "city", name: payload.city_name });
  return { ok: true, city };
}

export async function addCitiesBatch(
  payload: CityBatchInput
): Promise<
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/cities/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add cities" };
  }

  const data = await res.json();
  const added = (data.added as number) ?? 0;
  if (added > 0) {
    notifyProfileDataChanged();
    const firstName = payload.cities[0]?.city_name;
    offerShareAfterPin(
      added === 1 && firstName
        ? { kind: "city", name: firstName }
        : { kind: "places", name: "places" }
    );
  }
  return {
    ok: true,
    added,
    skipped: (data.skipped as number) ?? 0,
  };
}

export async function deleteCitiesBatch(
  payload: CityBatchDeleteInput
): Promise<{ ok: true; deleted: number; ids: string[] } | { ok: false; error: string }> {
  const res = await fetch("/api/cities/batch", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to delete cities" };
  }

  const data = await res.json();
  const ids = Array.isArray(data.ids) ? (data.ids as string[]) : payload.ids;
  const deleted = (data.deleted as number) ?? ids.length;

  if (deleted > 0) {
    notifyProfileDataChanged(undefined, { removeCityIds: ids });
  }

  return { ok: true, deleted, ids };
}
