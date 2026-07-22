import { formatCityDisplayName, normalizeCityKey } from "@/lib/utils/city-name";

const COUNTRY_ALIASES: Record<string, Record<string, string>> = {
  CZ: {
    [normalizeCityKey("Praha")]: normalizeCityKey("Prague"),
    [normalizeCityKey("Prague 1")]: normalizeCityKey("Prague"),
    [normalizeCityKey("Praha 1")]: normalizeCityKey("Prague"),
  },
  DE: {
    [normalizeCityKey("Cologne")]: normalizeCityKey("Köln"),
    [normalizeCityKey("Nuremberg")]: normalizeCityKey("Nürnberg"),
    [normalizeCityKey("Frankfurt")]: normalizeCityKey("Frankfurt am Main"),
  },
  TR: {
    [normalizeCityKey("Cappadocia")]: normalizeCityKey("Göreme"),
    [normalizeCityKey("Goreme")]: normalizeCityKey("Göreme"),
    [normalizeCityKey("Sanliurfa")]: normalizeCityKey("Şanlıurfa"),
    [normalizeCityKey("Canakkale")]: normalizeCityKey("Çanakkale"),
  },
  TH: {
    [normalizeCityKey("Muang Pattaya")]: normalizeCityKey("Pattaya"),
    [normalizeCityKey("Pattaya City")]: normalizeCityKey("Pattaya"),
    [normalizeCityKey("Pa Tong")]: normalizeCityKey("Patong"),
  },
  GR: {
    [normalizeCityKey("Thessaloníki")]: normalizeCityKey("Thessaloniki"),
    [normalizeCityKey("Irákleion")]: normalizeCityKey("Heraklion"),
    [normalizeCityKey("Irakleion")]: normalizeCityKey("Heraklion"),
    [normalizeCityKey("Pátra")]: normalizeCityKey("Patras"),
    [normalizeCityKey("Patra")]: normalizeCityKey("Patras"),
    [normalizeCityKey("Meis")]: normalizeCityKey("Kastellorizo"),
    [normalizeCityKey("Rodos")]: normalizeCityKey("Rhodes"),
    [normalizeCityKey("Midilli")]: normalizeCityKey("Mytilene"),
    [normalizeCityKey("Sisam")]: normalizeCityKey("Samos"),
    [normalizeCityKey("Sakız")]: normalizeCityKey("Chios"),
    [normalizeCityKey("İstanköy")]: normalizeCityKey("Kos"),
  },
};

const CANONICAL_DISPLAY: Record<string, Record<string, string>> = {
  CZ: {
    [normalizeCityKey("Prague")]: "Prague",
  },
  DE: {
    [normalizeCityKey("Köln")]: "Köln",
    [normalizeCityKey("Nürnberg")]: "Nürnberg",
    [normalizeCityKey("Frankfurt am Main")]: "Frankfurt am Main",
  },
  TR: {
    [normalizeCityKey("Göreme")]: "Göreme",
    [normalizeCityKey("Şanlıurfa")]: "Şanlıurfa",
    [normalizeCityKey("Çanakkale")]: "Çanakkale",
    [normalizeCityKey("Çeşme")]: "Çeşme",
    [normalizeCityKey("Kuşadası")]: "Kuşadası",
    [normalizeCityKey("Istanbul")]: "İstanbul",
    [normalizeCityKey("Izmir")]: "İzmir",
  },
  TH: {
    [normalizeCityKey("Pattaya")]: "Pattaya",
    [normalizeCityKey("Patong")]: "Patong",
  },
  GR: {
    [normalizeCityKey("Thessaloniki")]: "Thessaloniki",
    [normalizeCityKey("Heraklion")]: "Heraklion",
    [normalizeCityKey("Patras")]: "Patras",
    [normalizeCityKey("Kastellorizo")]: "Kastellorizo",
    [normalizeCityKey("Rhodes")]: "Rhodes",
    [normalizeCityKey("Mytilene")]: "Mytilene",
  },
};

export function resolveCanonicalNormalizedKey(countryCode: string, cityName: string): string {
  const code = countryCode.toUpperCase();
  const normalized = normalizeCityKey(cityName);

  if (code === "CZ") {
    if (normalized === "praha" || normalized === "prague") return "prague";
    if (/^praha \d+$/.test(normalized) || /^prague \d+$/.test(normalized)) {
      return "prague";
    }
  }

  const countryAlias = COUNTRY_ALIASES[code]?.[normalized];
  if (countryAlias) return countryAlias;

  return normalized;
}

export function canonicalCityName(countryCode: string, cityName: string): string {
  const code = countryCode.toUpperCase();
  const key = resolveCanonicalNormalizedKey(code, cityName);
  const display = CANONICAL_DISPLAY[code]?.[key];
  if (display) return display;
  if (key !== normalizeCityKey(cityName)) {
    return formatCityDisplayName(key);
  }
  return formatCityDisplayName(cityName);
}

export function canonicalCityKey(countryCode: string, cityName: string): string {
  return `${countryCode.toUpperCase()}:${resolveCanonicalNormalizedKey(countryCode, cityName)}`;
}

export function citiesAreSame(countryCode: string, a: string, b: string): boolean {
  return canonicalCityKey(countryCode, a) === canonicalCityKey(countryCode, b);
}
