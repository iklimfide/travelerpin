import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import type { ParkType } from "@/types/database";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";

/**
 * [countryCode, englishCatalogName, turkishDisplay]
 * Only list parks whose everyday Turkish label differs from the EN catalog name.
 */
const PARK_TR_ENTRIES: ReadonlyArray<readonly [string, string, string]> = [
  // TR — Wikidata EN labels → official / common Turkish names
  ["TR", "Altınbeşik Cave", "Altınbeşik Mağarası Milli Parkı"],
  ["TR", "Altındere Valley", "Altındere Vadisi Milli Parkı"],
  ["TR", "Arboretum Island", "Adalar Arboretumu"],
  ["TR", "Atatürk Arboretum", "Atatürk Arboretumu"],
  ["TR", "Bird Paradise", "Kuş Cenneti Milli Parkı"],
  ["TR", "Botan Valley", "Botan Vadisi Milli Parkı"],
  ["TR", "Bursa Botanic Park", "Bursa Botanik Park"],
  ["TR", "Commander-in-Chief National Historic Park", "Başkomutanlık Tarihi Milli Parkı"],
  ["TR", "Derebucak Çamlık Caves", "Derebucak Çamlık Mağaraları Milli Parkı"],
  ["TR", "Dilek Peninsula-Büyük Menderes Delta", "Dilek Yarımadası-Büyük Menderes Deltası Milli Parkı"],
  ["TR", "Düden Waterfalls", "Düden Şelalesi"],
  ["TR", "Gallipoli Peninsula Historic Site", "Gelibolu Yarımadası Tarihi Alanı"],
  ["TR", "Geben Valley", "Geben Vadisi Milli Parkı"],
  ["TR", "Hakkâri Cilo and Sat Mountains", "Hakkâri Cilo ve Sat Dağları Milli Parkı"],
  ["TR", "Hatila Valley", "Hatila Vadisi Milli Parkı"],
  ["TR", "Istanbul University Alfred Heilbronn", "İstanbul Üniversitesi Alfred Heilbronn Botanik Bahçesi"],
  ["TR", "İğneada Swamp", "İğneada Longoz Ormanları Milli Parkı"],
  ["TR", "Kaçkar Mountains", "Kaçkar Dağları Milli Parkı"],
  ["TR", "Karaca Arboretum", "Karaca Arboretumu"],
  ["TR", "Kop Mountain National Historic Park", "Kop Dağı Tarihi Milli Parkı"],
  ["TR", "Köprülü Canyon", "Köprülü Kanyon Milli Parkı"],
  ["TR", "Küre Mountains", "Küre Dağları Milli Parkı"],
  ["TR", "Lake Abant", "Abant Gölü Milli Parkı"],
  ["TR", "Lake Beyşehir", "Beyşehir Gölü Milli Parkı"],
  ["TR", "Lake Gala", "Gala Gölü Milli Parkı"],
  ["TR", "Lake Kovada", "Kovada Gölü Milli Parkı"],
  ["TR", "Marmaris", "Marmaris Milli Parkı"],
  ["TR", "Mount Ağrı", "Ağrı Dağı Milli Parkı"],
  ["TR", "Mount Güllük-Termessos", "Güllük Dağı-Termessos Milli Parkı"],
  ["TR", "Mount Honaz", "Honaz Dağı Milli Parkı"],
  ["TR", "Mount Ida", "Kaz Dağı Milli Parkı"],
  ["TR", "Mount Ilgaz", "Ilgaz Dağı Milli Parkı"],
  ["TR", "Mount Nemrut", "Nemrut Dağı Milli Parkı"],
  ["TR", "Mount Sarıçalı", "Sarıçalı Dağı Milli Parkı"],
  ["TR", "Mount Spil", "Spil Dağı Milli Parkı"],
  ["TR", "Munzur Valley", "Munzur Vadisi Milli Parkı"],
  ["TR", "Nene Hatun Historical", "Nene Hatun Tarihi Milli Parkı"],
  ["TR", "Olympos Beydaglari", "Olympos Beydağları Milli Parkı"],
  ["TR", "Saklıkent Canyon", "Saklıkent Milli Parkı"],
  ["TR", "Sarıkamış-Allahuekber Mountains", "Sarıkamış-Allahuekber Dağları Milli Parkı"],
  ["TR", "Sultan Reedy", "Sultan Sazlığı Milli Parkı"],
  ["TR", "Tek Tek Mountains", "Tek Tek Dağları Milli Parkı"],
  ["TR", "Tosun Terzioğlu Garden", "Tosun Terzioğlu Botanik Bahçesi"],
  ["TR", "Troy", "Truva"],
  ["TR", "Yozgat Pine Grove", "Yozgat Çamlığı Milli Parkı"],
  ["TR", "Yumurtalık Lagoon", "Yumurtalık Lagünü Milli Parkı"],

  // Popular international parks
  ["US", "Grand Canyon", "Büyük Kanyon"],
  ["US", "Niagara Falls", "Niagara Şelaleleri"],
  ["TZ", "Serengeti National Park", "Serengeti Milli Parkı"],
  ["DE", "Black Forest", "Kara Orman"],
  ["FR", "Pyrénées", "Pireneler"],
  ["FR", "French Alps", "Fransız Alpleri"],
  ["HR", "Plitvice Lakes", "Plitviçe Gölleri"],
  ["GB", "Lake District", "Göl Bölgesi Milli Parkı"],
  ["GB", "Scottish Highlands", "İskoç Yaylaları"],
  ["TH", "James Bond Island (Ko Tapu)", "James Bond Adası (Ko Tapu)"],
  ["TH", "Phi Phi Islands", "Phi Phi Adaları"],
  ["IT", "Lake Garda", "Garda Gölü"],
  ["IT", "Vesuvius", "Vezuv"],
  ["EG", "Dead Sea", "Ölü Deniz"],
  ["CH", "Swiss", "İsviçre Milli Parkı"],
];

const PARK_NAMES_TR: Record<string, Record<string, string>> = {};
const TR_PARK_KEY_TO_CANONICAL: Record<string, Record<string, string>> = {};

for (const [countryCode, englishHint, turkish] of PARK_TR_ENTRIES) {
  const canonical = formatCityDisplayName(englishHint);
  const key = normalizeCityKey(canonical);
  const hintKey = normalizeCityKey(englishHint);
  (PARK_NAMES_TR[countryCode] ??= {})[key] = turkish;
  (PARK_NAMES_TR[countryCode] ??= {})[hintKey] = turkish;
  (TR_PARK_KEY_TO_CANONICAL[countryCode] ??= {})[key] = canonical;
  (TR_PARK_KEY_TO_CANONICAL[countryCode] ??= {})[hintKey] = canonical;
}

export function parkNameTrOverrideKey(
  countryCode: string,
  parkName: string,
  parkType: ParkType
): string {
  const code = countryCode.toUpperCase();
  const canonical = formatCityDisplayName(parkName);
  return `${code}:${catalogNameKey(canonical, code)}:${parkType}`;
}

function getStaticTurkishParkName(
  countryCode: string,
  canonical: string,
  rawName?: string
): string {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(canonical);
  return (
    PARK_NAMES_TR[code]?.[key] ??
    PARK_NAMES_TR[code]?.[normalizeCityKey(rawName ?? canonical)] ??
    canonical
  );
}

/** Curated TR catalog; null when TR label equals EN canonical. */
export function resolveParkNameTr(
  countryCode: string,
  parkName: string,
  overrides?: ReadonlyMap<string, string> | null,
  parkType?: ParkType
): string | null {
  const code = countryCode.toUpperCase();
  const canonical = formatCityDisplayName(parkName);
  if (overrides && parkType) {
    const fromDb = overrides.get(parkNameTrOverrideKey(code, canonical, parkType));
    if (fromDb) return fromDb;
  }

  const localized = getStaticTurkishParkName(code, canonical, parkName);
  return localized !== canonical ? localized : null;
}

/**
 * Display name for a park in the active locale.
 * Canonical EN identity (slugs/DB) stays unchanged — UI-only.
 */
export function getLocalizedParkName(
  countryCode: string,
  parkName: string,
  locale: Locale = defaultLocale,
  options?: {
    nameTr?: string | null;
    nameTrOverrides?: ReadonlyMap<string, string> | null;
    parkType?: ParkType;
  }
): string {
  const canonical = formatCityDisplayName(parkName);
  if (locale !== "tr") return canonical;

  return (
    options?.nameTr ??
    resolveParkNameTr(countryCode, canonical, options?.nameTrOverrides, options?.parkType) ??
    canonical
  );
}

/** Match a park against a search query using both canonical and localized labels. */
export function parkMatchesLocalizedSearch(
  countryCode: string,
  parkName: string,
  query: string,
  locale: Locale = defaultLocale,
  options?: { nameTr?: string | null; nameTrOverrides?: ReadonlyMap<string, string> | null; parkType?: ParkType }
): boolean {
  const canonical = formatCityDisplayName(parkName);
  if (matchesPlaceNameSearch(canonical, query)) return true;
  if (locale === "tr") {
    const localized =
      options?.nameTr ??
      resolveParkNameTr(
        countryCode,
        canonical,
        options?.nameTrOverrides,
        options?.parkType
      ) ??
      getStaticTurkishParkName(countryCode, canonical, parkName);
    if (localized !== canonical && matchesPlaceNameSearch(localized, query)) {
      return true;
    }
  }
  return false;
}

/** Parks whose Turkish label matches the query (when EN catalog alone would miss). */
export function findCanonicalParksByLocalizedQuery(
  query: string,
  locale: Locale = defaultLocale
): Array<{ countryCode: string; parkName: string }> {
  if (locale !== "tr") return [];

  const seen = new Set<string>();
  const hits: Array<{ countryCode: string; parkName: string }> = [];

  for (const [countryCode, byPark] of Object.entries(PARK_NAMES_TR)) {
    for (const [normalizedKey, trName] of Object.entries(byPark)) {
      if (!matchesPlaceNameSearch(trName, query)) continue;
      const canonical =
        TR_PARK_KEY_TO_CANONICAL[countryCode]?.[normalizedKey] ??
        formatCityDisplayName(normalizedKey);
      const id = `${countryCode}:${normalizeCityKey(canonical)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      hits.push({ countryCode, parkName: canonical });
    }
  }

  return hits;
}
