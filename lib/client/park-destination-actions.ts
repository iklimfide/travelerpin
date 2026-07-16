import type { QuickParkInput } from "@/lib/validations/park";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { offerShareAfterPin } from "@/lib/client/share-pin-prompt";

export async function quickAddPark(
  payload: QuickParkInput
): Promise<
  | { ok: true; added: boolean; alreadyHad: boolean }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/parks/quick-add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add park" };
  }

  const data = await res.json();
  const added = Boolean(data.added);
  if (added) {
    notifyProfileDataChanged();
    const kind =
      payload.park_type === "national_park" || payload.park_type === "botanical_garden"
        ? "national_park"
        : payload.park_type === "theme_park"
          ? "theme_park"
          : "park";
    offerShareAfterPin({ kind, name: payload.park_name });
  }
  return {
    ok: true,
    added,
    alreadyHad: Boolean(data.alreadyHad),
  };
}

export async function quickRemovePark(
  payload: Pick<QuickParkInput, "park_name" | "park_type" | "country_code">
): Promise<
  | { ok: true; removed: boolean; countryRemoved: boolean }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/parks/quick-remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to remove park" };
  }

  const data = await res.json();
  const removed = Boolean(data.removed);
  if (removed) {
    notifyProfileDataChanged();
  }
  return {
    ok: true,
    removed,
    countryRemoved: Boolean(data.countryRemoved),
  };
}
