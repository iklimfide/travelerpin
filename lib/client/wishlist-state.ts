import { addWishlistCountry, removeWishlistCountry } from "@/lib/client/country-actions";
import { fetchTravelState } from "@/lib/client/travel-state";
import { isUkNationCode, isUkNationVisited } from "@/lib/data/uk-nations";
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

export async function savePendingWishlistChanges(params: {
  pendingCountryCodes: Iterable<string>;
  pendingRemoveCountryCodes: Iterable<string>;
  wishlistCountries: WishlistCountry[];
  wishlistCodes: ReadonlySet<string>;
  visitedCodes: ReadonlySet<string>;
}): Promise<{ ok: true; savedCount: number } | { ok: false; error: string }> {
  const idsByCode = wishlistIdByCode(params.wishlistCountries);
  let savedCount = 0;

  for (const rawCode of params.pendingRemoveCountryCodes) {
    const code = rawCode.toUpperCase();
    if (!isCountryOnWishlist(code, params.wishlistCodes)) continue;

    const id = idsByCode.get(code);
    if (!id) continue;

    const result = await removeWishlistCountry(id);
    if (!result.ok) return result;
    savedCount += 1;
  }

  for (const rawCode of params.pendingCountryCodes) {
    const code = rawCode.toUpperCase();
    if (isCountryOnWishlist(code, params.wishlistCodes)) continue;
    if (isCountryVisited(code, params.visitedCodes)) continue;

    const result = await addWishlistCountry(code);
    if (!result.ok) return result;
    savedCount += 1;
  }

  if (savedCount > 0) {
    await fetchTravelState({ force: true });
  }

  return { ok: true, savedCount };
}
