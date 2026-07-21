import { getCountryName } from "@/lib/data/countries";
import { isUkNationCode, isUkNationVisited } from "@/lib/data/uk-nations";
import {
  notifyTravelStateUpdated,
  readTravelStateCache,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import { refreshTravelStateAfterSave } from "@/lib/client/travel-state";
import type { WishlistBatchInput } from "@/lib/validations/wishlist-batch";
import type { WishlistCountry } from "@/types/database";

function isCountryVisited(code: string, visitedCodes: ReadonlySet<string>): boolean {
  return isUkNationCode(code) ? isUkNationVisited(code, visitedCodes) : visitedCodes.has(code);
}

function isCountryOnWishlist(code: string, wishlistCodes: ReadonlySet<string>): boolean {
  return isUkNationCode(code) ? isUkNationVisited(code, wishlistCodes) : wishlistCodes.has(code);
}

function wishlistIdByCode(countries: WishlistCountry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const country of countries) {
    map.set(country.country_code.toUpperCase(), country.id);
  }
  return map;
}

function wishlistCodesFromCountries(countries: WishlistCountry[]): string[] {
  return countries.map((country) => country.country_code.toUpperCase());
}

export function buildOptimisticWishlist(params: {
  wishlistCountries: WishlistCountry[];
  pendingCountryCodes: Iterable<string>;
  pendingRemoveCountryCodes: Iterable<string>;
  wishlistCodes: ReadonlySet<string>;
  visitedCodes: ReadonlySet<string>;
}): WishlistCountry[] {
  const idsByCode = wishlistIdByCode(params.wishlistCountries);
  const removeCodes = new Set(
    [...params.pendingRemoveCountryCodes]
      .map((code) => code.toUpperCase())
      .filter((code) => isCountryOnWishlist(code, params.wishlistCodes))
  );

  let next = params.wishlistCountries.filter(
    (country) => !removeCodes.has(country.country_code.toUpperCase())
  );

  const existingCodes = new Set(next.map((country) => country.country_code.toUpperCase()));

  for (const rawCode of params.pendingCountryCodes) {
    const code = rawCode.toUpperCase();
    if (isCountryOnWishlist(code, params.wishlistCodes)) continue;
    if (isCountryVisited(code, params.visitedCodes)) continue;
    if (existingCodes.has(code)) continue;

    next = [
      ...next,
      {
        id: `optimistic-${code}`,
        user_id: "",
        country_code: code,
        country_name: getCountryName(code),
        created_at: new Date().toISOString(),
      },
    ];
    existingCodes.add(code);
  }

  return next;
}

async function patchWishlistBatch(
  payload: WishlistBatchInput
): Promise<{ ok: true; added: number; removed: number } | { ok: false; error: string }> {
  const res = await fetch("/api/wishlist/countries/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: (data.error as string) ?? "Failed to update wishlist",
    };
  }

  const data = (await res.json()) as { added?: number; removed?: number };
  return {
    ok: true,
    added: data.added ?? 0,
    removed: data.removed ?? 0,
  };
}

function buildWishlistBatchPayload(params: {
  pendingCountryCodes: Iterable<string>;
  pendingRemoveCountryCodes: Iterable<string>;
  wishlistCountries: WishlistCountry[];
  wishlistCodes: ReadonlySet<string>;
  visitedCodes: ReadonlySet<string>;
}): WishlistBatchInput {
  const idsByCode = wishlistIdByCode(params.wishlistCountries);
  const remove_ids: string[] = [];

  for (const rawCode of params.pendingRemoveCountryCodes) {
    const code = rawCode.toUpperCase();
    if (!isCountryOnWishlist(code, params.wishlistCodes)) continue;
    const id = idsByCode.get(code);
    if (id) remove_ids.push(id);
  }

  const add = [...params.pendingCountryCodes]
    .map((code) => code.toUpperCase())
    .filter((code) => !isCountryOnWishlist(code, params.wishlistCodes))
    .filter((code) => !isCountryVisited(code, params.visitedCodes))
    .map((code) => ({
      country_code: code,
      country_name: getCountryName(code),
    }));

  return { add, remove_ids };
}

type PersistWishlistOptions = {
  onError?: (message: string) => void;
};

/** Optimistic wishlist save: updates cache immediately, persists in the background. */
export function persistWishlistChanges(
  params: {
    pendingCountryCodes: Iterable<string>;
    pendingRemoveCountryCodes: Iterable<string>;
    wishlistCountries: WishlistCountry[];
    wishlistCodes: ReadonlySet<string>;
    visitedCodes: ReadonlySet<string>;
  },
  options?: PersistWishlistOptions
): void {
  const cached = readTravelStateCache();
  const previousWishlist = params.wishlistCountries;
  const optimisticWishlist = buildOptimisticWishlist(params);
  const payload = buildWishlistBatchPayload(params);

  if (payload.add.length === 0 && payload.remove_ids.length === 0) {
    return;
  }

  const nextData: TravelStateData = {
    visitedCountries: cached?.visitedCountries ?? [],
    visitedCities: cached?.visitedCities ?? [],
    visitedParks: cached?.visitedParks ?? [],
    wishlistCountries: optimisticWishlist,
    visitedCodes: cached?.visitedCodes ?? [...params.visitedCodes],
    stats: cached?.stats ?? {
      countries: 0,
      cities: 0,
      nationalParks: 0,
      themeParks: 0,
    },
  };
  notifyTravelStateUpdated(nextData);

  void (async () => {
    const result = await patchWishlistBatch(payload);
    if (!result.ok) {
      const rollback: TravelStateData = {
        ...nextData,
        wishlistCountries: previousWishlist,
      };
      notifyTravelStateUpdated(rollback);
      options?.onError?.(result.error);
      return;
    }

    refreshTravelStateAfterSave();
  })();
}

export async function savePendingWishlistChanges(params: {
  pendingCountryCodes: Iterable<string>;
  pendingRemoveCountryCodes: Iterable<string>;
  wishlistCountries: WishlistCountry[];
  wishlistCodes: ReadonlySet<string>;
  visitedCodes: ReadonlySet<string>;
}): Promise<{ ok: true; savedCount: number } | { ok: false; error: string }> {
  const payload = buildWishlistBatchPayload(params);
  if (payload.add.length === 0 && payload.remove_ids.length === 0) {
    return { ok: true, savedCount: 0 };
  }

  const result = await patchWishlistBatch(payload);
  if (!result.ok) return result;

  refreshTravelStateAfterSave();
  return { ok: true, savedCount: result.added + result.removed };
}
