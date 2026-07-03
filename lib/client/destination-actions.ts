import type { QuickDestinationInput } from "@/lib/validations/destination";
import { offerShareAfterPin } from "@/lib/client/share-pin-prompt";

export async function quickAddDestination(
  payload: QuickDestinationInput
): Promise<
  | { ok: true; added: boolean; alreadyHad: boolean }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/destinations/quick-add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add destination" };
  }

  const data = await res.json();
  const added = Boolean(data.added);
  if (added) {
    offerShareAfterPin(
      payload.kind === "country"
        ? { kind: "country", name: payload.country_name }
        : { kind: "city", name: payload.city_name }
    );
  }
  return {
    ok: true,
    added,
    alreadyHad: Boolean(data.alreadyHad),
  };
}

export async function quickRemoveDestination(
  payload: QuickDestinationInput
): Promise<
  | { ok: true; removed: boolean; countryRemoved: boolean; notFound?: boolean }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/destinations/quick-remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to remove destination" };
  }

  const data = await res.json();
  return {
    ok: true,
    removed: Boolean(data.removed),
    countryRemoved: Boolean(data.countryRemoved),
    notFound: Boolean(data.notFound),
  };
}
