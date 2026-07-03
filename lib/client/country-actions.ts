import { getCountryName } from "@/lib/data/countries";
import { offerShareAfterPin } from "@/lib/client/share-pin-prompt";

export async function addVisitedCountry(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const countryName = getCountryName(code);
  const res = await fetch("/api/countries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      country_code: code,
      country_name: countryName,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add country" };
  }

  offerShareAfterPin({ kind: "country", name: countryName });
  return { ok: true };
}

export async function removeVisitedCountry(
  visitedId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/countries/${visitedId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to remove country" };
  }

  return { ok: true };
}

export async function addWishlistCountry(
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/wishlist/countries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      country_code: code,
      country_name: getCountryName(code),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to add to wishlist" };
  }

  return { ok: true };
}

export async function removeWishlistCountry(
  wishlistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/wishlist/countries/${wishlistId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data.error as string) ?? "Failed to remove from wishlist" };
  }

  return { ok: true };
}
