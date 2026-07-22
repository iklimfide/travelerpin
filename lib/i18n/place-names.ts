import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";

/**
 * [countryCode, englishCanonicalHint, turkishDisplay]
 * Only list cities whose everyday Turkish label differs from the EN catalog name.
 * Unlisted cities keep their canonical English display name.
 */
const CITY_TR_ENTRIES: ReadonlyArray<readonly [string, string, string]> = [
  // AE
  ["AE", "Abu Dhabi", "Abu Dabi"],
  ["AE", "Sharjah", "Şarika"],
  // AL
  ["AL", "Tirana", "Tiran"],
  // AM
  ["AM", "Yerevan", "Erivan"],
  // AT
  ["AT", "Vienna", "Viyana"],
  // AU
  ["AU", "Sydney", "Sidney"],
  // AZ
  ["AZ", "Baku", "Bakü"],
  // BA
  ["BA", "Sarajevo", "Saraybosna"],
  // BE
  ["BE", "Brussels", "Brüksel"],
  ["BE", "Antwerp", "Anvers"],
  ["BE", "Bruges", "Brugge"],
  ["BE", "Ghent", "Gent"],
  // BG
  ["BG", "Sofia", "Sofya"],
  ["BG", "Plovdiv", "Filibe"],
  // BY
  ["BY", "Minsk", "Minsk"],
  // CH
  ["CH", "Zurich", "Zürih"],
  ["CH", "Geneva", "Cenevre"],
  ["CH", "Lucerne", "Luzern"],
  // CN
  ["CN", "Beijing", "Pekin"],
  ["CN", "Shanghai", "Şanghay"],
  ["CN", "Guangzhou", "Kanton"],
  // CY
  ["CY", "Nicosia", "Lefkoşa"],
  ["CY", "Limassol", "Limasol"],
  ["CY", "Larnaca", "Larnaka"],
  ["CY", "Paphos", "Baf"],
  // CZ
  ["CZ", "Prague", "Prag"],
  // DE
  ["DE", "Munich", "Münih"],
  ["DE", "Cologne", "Köln"],
  ["DE", "Köln", "Köln"],
  ["DE", "Frankfurt am Main", "Frankfurt"],
  // DK
  ["DK", "Copenhagen", "Kopenhag"],
  // DZ
  ["DZ", "Algiers", "Cezayir"],
  // EG
  ["EG", "Cairo", "Kahire"],
  ["EG", "Alexandria", "İskenderiye"],
  ["EG", "Giza", "Gize"],
  ["EG", "Luxor", "Luksor"],
  // ES
  ["ES", "Barcelona", "Barselona"],
  ["ES", "Seville", "Sevilla"],
  ["ES", "Valencia", "Valensiya"],
  // FR
  ["FR", "Marseille", "Marsilya"],
  ["FR", "Strasbourg", "Strazburg"],
  // GB / UK nations catalog as GB
  ["GB", "London", "Londra"],
  // GE
  ["GE", "Tbilisi", "Tiflis"],
  ["GE", "Batumi", "Batum"],
  // GR
  ["GR", "Athens", "Atina"],
  ["GR", "Thessaloniki", "Selanik"],
  ["GR", "Heraklion", "Kandiye"],
  ["GR", "Rhodes", "Rodos"],
  ["GR", "Kastellorizo", "Meis"],
  ["GR", "Kos", "İstanköy"],
  ["GR", "Samos", "Sisam"],
  ["GR", "Chios", "Sakız"],
  ["GR", "Mytilene", "Midilli"],
  ["GR", "Mykonos", "Mikonos"],
  ["GR", "Corfu", "Korfu"],
  ["GR", "Patras", "Patras"],
  // HR
  ["HR", "Dubrovnik", "Dubrovnik"],
  // HU
  ["HU", "Budapest", "Budapeşte"],
  // ID
  ["ID", "Jakarta", "Cakarta"],
  // IL
  ["IL", "Jerusalem", "Kudüs"],
  ["IL", "Haifa", "Hayfa"],
  // IN
  ["IN", "New Delhi", "Yeni Delhi"],
  ["IN", "Kolkata", "Kalküta"],
  ["IN", "Bangalore", "Bengaluru"],
  // IQ
  ["IQ", "Baghdad", "Bağdat"],
  // IR
  ["IR", "Tehran", "Tahran"],
  ["IR", "Isfahan", "İsfahan"],
  ["IR", "Shiraz", "Şiraz"],
  // IT
  ["IT", "Rome", "Roma"],
  ["IT", "Milan", "Milano"],
  ["IT", "Naples", "Napoli"],
  ["IT", "Florence", "Floransa"],
  ["IT", "Venice", "Venedik"],
  ["IT", "Turin", "Torino"],
  ["IT", "Genoa", "Cenova"],
  ["IT", "Padua", "Padova"],
  ["IT", "Syracuse", "Siracusa"],
  // JP
  ["JP", "Hiroshima", "Hiroşima"],
  // KR
  ["KR", "Seoul", "Seul"],
  ["KR", "Busan", "Pusan"],
  // LB
  ["LB", "Beirut", "Beyrut"],
  // LT
  ["LT", "Vilnius", "Vilnius"],
  // LU
  ["LU", "Luxembourg", "Lüksemburg"],
  ["LU", "Luxembourg City", "Lüksemburg"],
  // LV
  ["LV", "Riga", "Riga"],
  // LY
  ["LY", "Tripoli", "Trablus"],
  // MA
  ["MA", "Casablanca", "Kazablanka"],
  ["MA", "Marrakesh", "Marrakeş"],
  ["MA", "Marrakech", "Marrakeş"],
  // MC
  ["MC", "Monaco", "Monako"],
  // MD
  ["MD", "Chisinau", "Kişinev"],
  ["MD", "Chișinău", "Kişinev"],
  // ME
  ["ME", "Podgorica", "Podgorica"],
  // MK
  ["MK", "Skopje", "Üsküp"],
  // MT
  ["MT", "Valletta", "Valetta"],
  // MX
  ["MX", "Mexico City", "Meksiko"],
  // NL
  ["NL", "The Hague", "Lahey"],
  ["NL", "The Hague (Den Haag)", "Lahey"],
  // NO
  ["NO", "Bergen", "Bergen"],
  // PL
  ["PL", "Warsaw", "Varşova"],
  ["PL", "Krakow", "Krakov"],
  ["PL", "Kraków", "Krakov"],
  ["PL", "Gdansk", "Gdansk"],
  ["PL", "Gdańsk", "Gdansk"],
  // PT
  ["PT", "Lisbon", "Lizbon"],
  // RO
  ["RO", "Bucharest", "Bükreş"],
  ["RO", "Constanta", "Köstence"],
  ["RO", "Constanța", "Köstence"],
  // RS
  ["RS", "Belgrade", "Belgrad"],
  // RU
  ["RU", "Moscow", "Moskova"],
  ["RU", "Saint Petersburg", "Sankt-Petersburg"],
  ["RU", "St Petersburg", "Sankt-Petersburg"],
  ["RU", "St. Petersburg", "Sankt-Petersburg"],
  // SA
  ["SA", "Riyadh", "Riyad"],
  ["SA", "Jeddah", "Cidde"],
  ["SA", "Mecca", "Mekke"],
  ["SA", "Medina", "Medine"],
  // SE
  ["SE", "Stockholm", "Stokholm"],
  ["SE", "Gothenburg", "Göteborg"],
  // SG
  ["SG", "Singapore", "Singapur"],
  // SI
  ["SI", "Ljubljana", "Ljubljana"],
  // SK
  ["SK", "Bratislava", "Bratislava"],
  // SY
  ["SY", "Damascus", "Şam"],
  ["SY", "Aleppo", "Halep"],
  // TN
  ["TN", "Tunis", "Tunus"],
  // TR — keep Turkish orthography for common catalog spellings
  ["TR", "Istanbul", "İstanbul"],
  ["TR", "Izmir", "İzmir"],
  ["TR", "Sanliurfa", "Şanlıurfa"],
  ["TR", "Canakkale", "Çanakkale"],
  ["TR", "Cesme", "Çeşme"],
  ["TR", "Kusadasi", "Kuşadası"],
  ["TR", "Goreme", "Göreme"],
  // UA
  ["UA", "Kyiv", "Kiev"],
  ["UA", "Kiev", "Kiev"],
  ["UA", "Odessa", "Odesa"],
  ["UA", "Odesa", "Odesa"],
  // US — keep Latin spellings (no Şikago / Vaşington)
  // VA
  ["VA", "Vatican City", "Vatikan"],
  // XK
  ["XK", "Pristina", "Priştine"],
  ["XK", "Prishtina", "Priştine"],
];

const CITY_NAMES_TR: Record<string, Record<string, string>> = {};
const TR_CITY_KEY_TO_CANONICAL: Record<string, Record<string, string>> = {};

for (const [countryCode, englishHint, turkish] of CITY_TR_ENTRIES) {
  const canonical = canonicalCityName(countryCode, englishHint);
  const key = normalizeCityKey(canonical);
  const hintKey = normalizeCityKey(englishHint);
  (CITY_NAMES_TR[countryCode] ??= {})[key] = turkish;
  (CITY_NAMES_TR[countryCode] ??= {})[hintKey] = turkish;
  (TR_CITY_KEY_TO_CANONICAL[countryCode] ??= {})[key] = canonical;
  (TR_CITY_KEY_TO_CANONICAL[countryCode] ??= {})[hintKey] = canonical;
}

export function cityNameTrOverrideKey(countryCode: string, cityName: string): string {
  const code = countryCode.toUpperCase();
  const canonical = canonicalCityName(code, cityName);
  return `${code}:${catalogNameKey(canonical, code)}`;
}

function getStaticTurkishCityName(countryCode: string, canonical: string, rawName?: string): string {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(canonical);
  return (
    CITY_NAMES_TR[code]?.[key] ??
    CITY_NAMES_TR[code]?.[normalizeCityKey(rawName ?? canonical)] ??
    canonical
  );
}

/** YP DB override first, else curated TR catalog; null when TR label equals EN canonical. */
export function resolveCityNameTr(
  countryCode: string,
  cityName: string,
  overrides?: ReadonlyMap<string, string> | null
): string | null {
  const code = countryCode.toUpperCase();
  const canonical = canonicalCityName(code, cityName);
  const fromDb = overrides?.get(cityNameTrOverrideKey(code, canonical));
  if (fromDb) return fromDb;

  const localized = getStaticTurkishCityName(code, canonical, cityName);
  return localized !== canonical ? localized : null;
}

/**
 * Display name for a city in the active locale.
 * Canonical EN identity (slugs/DB) stays unchanged — this is UI-only.
 */
export function getLocalizedCityName(
  countryCode: string,
  cityName: string,
  locale: Locale = defaultLocale,
  nameTrOverrides?: ReadonlyMap<string, string> | null
): string {
  const canonical = canonicalCityName(countryCode, cityName);
  if (locale !== "tr") return canonical;

  return resolveCityNameTr(countryCode, canonical, nameTrOverrides) ?? canonical;
}

/** Match a city against a search query using both canonical and localized labels. */
export function cityMatchesLocalizedSearch(
  countryCode: string,
  cityName: string,
  query: string,
  locale: Locale = defaultLocale,
  options?: { nameTr?: string | null; nameTrOverrides?: ReadonlyMap<string, string> | null }
): boolean {
  const canonical = canonicalCityName(countryCode, cityName);
  if (matchesPlaceNameSearch(canonical, query)) return true;
  if (locale === "tr") {
    const localized =
      options?.nameTr ??
      resolveCityNameTr(countryCode, canonical, options?.nameTrOverrides) ??
      getStaticTurkishCityName(countryCode, canonical, cityName);
    if (localized !== canonical && matchesPlaceNameSearch(localized, query)) {
      return true;
    }
  }
  return false;
}

/**
 * Cities whose Turkish label matches the query (when EN catalog alone would miss).
 */
export function findCanonicalCitiesByLocalizedQuery(
  query: string,
  locale: Locale = defaultLocale
): Array<{ countryCode: string; cityName: string }> {
  if (locale !== "tr") return [];

  const seen = new Set<string>();
  const hits: Array<{ countryCode: string; cityName: string }> = [];

  for (const [countryCode, byCity] of Object.entries(CITY_NAMES_TR)) {
    for (const [normalizedKey, trName] of Object.entries(byCity)) {
      if (!matchesPlaceNameSearch(trName, query)) continue;
      const canonical =
        TR_CITY_KEY_TO_CANONICAL[countryCode]?.[normalizedKey] ??
        canonicalCityName(countryCode, normalizedKey);
      const id = `${countryCode}:${normalizeCityKey(canonical)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      hits.push({ countryCode, cityName: canonical });
    }
  }

  return hits;
}
