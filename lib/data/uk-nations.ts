import type { CountryOption } from "@/lib/data/countries";

/** Internal listing codes — not ISO sovereign states; stored in visited_countries like KT. */
export const UK_NATION_CODES = ["EN", "SF", "WL"] as const;

export type UkNationCode = (typeof UK_NATION_CODES)[number];

export const UK_LEGACY_CODE = "GB";

const UK_NATION_NAMES: Record<UkNationCode, string> = {
  EN: "England",
  SF: "Scotland",
  WL: "Wales",
};

const UK_NATION_SEARCH_EXTRA: Record<UkNationCode, readonly string[]> = {
  EN: ["england", "english", "uk", "united kingdom", "britain", "great britain"],
  SF: ["scotland", "scottish", "uk", "united kingdom"],
  WL: ["wales", "welsh", "cymru", "uk", "united kingdom"],
};

export const UK_NATION_OPTIONS: CountryOption[] = UK_NATION_CODES.map((code) => {
  const name = UK_NATION_NAMES[code];
  const extras = UK_NATION_SEARCH_EXTRA[code];
  return {
    code,
    name,
    searchText: `${name} ${code} ${extras.join(" ")}`.toLowerCase(),
  };
});

export function isUkNationCode(code: string): code is UkNationCode {
  return UK_NATION_CODES.includes(code.toUpperCase() as UkNationCode);
}

export function getUkNationName(code: string): string | null {
  const normalized = code.toUpperCase();
  if (!isUkNationCode(normalized)) return null;
  return UK_NATION_NAMES[normalized];
}

/** Tourist city catalog and geodata use GB for all UK nations. */
export function catalogCountryCode(code: string): string {
  return isUkNationCode(code) ? UK_LEGACY_CODE : code.toUpperCase();
}

/** Flag assets are stored under GB. */
export function flagCountryCode(code: string): string {
  return isUkNationCode(code) || code.toUpperCase() === UK_LEGACY_CODE
    ? UK_LEGACY_CODE
    : code.toUpperCase();
}

export function isUkNationVisited(
  code: string,
  visitedCodes: ReadonlySet<string>
): boolean {
  const normalized = code.toUpperCase();
  if (!isUkNationCode(normalized)) return visitedCodes.has(normalized);
  return visitedCodes.has(normalized) || visitedCodes.has(UK_LEGACY_CODE);
}

/** Keep the unified UK shape on the map when any nation (or legacy GB) is visited. */
export function withUkMapCountryCodes(codes: Iterable<string>): string[] {
  const set = new Set([...codes].map((code) => code.toUpperCase()));
  const hasUkVisit =
    set.has(UK_LEGACY_CODE) || UK_NATION_CODES.some((code) => set.has(code));
  if (hasUkVisit) {
    set.add(UK_LEGACY_CODE);
  }
  return [...set];
}

export function matchesUkCityCountry(
  cityCountryCode: string,
  pickerCountryCode: string
): boolean {
  const picker = pickerCountryCode.toUpperCase();
  const city = cityCountryCode.toUpperCase();
  if (isUkNationCode(picker)) {
    return city === picker || city === UK_LEGACY_CODE;
  }
  return city === picker;
}
