import { buildVisitedCountryList } from "@/lib/map/travel-lists";
import { getCountryName } from "@/lib/data/countries";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { ParkType, VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import {
  buildProfileTrips,
  countryLastPinnedAt,
  deprioritizeResidenceCountry,
  type ProfileTrip,
} from "@/lib/utils/profile-page";
import { resolveResidenceCountryCode } from "@/lib/utils/residence-city";

function countryHubSlug(countryCode: string, countryName?: string): string | null {
  return resolveCountryHubSlug(countryCode, countryName);
}

export type ProfileCountryDestination = {
  code: string;
  name: string;
  countrySlug: string | null;
  cityCount: number;
  parkCount: number;
  visitedId?: string;
  visitedViaPlacesOnly: boolean;
};

export type ProfileParkDestination = {
  id: string;
  parkName: string;
  parkSlug: string | null;
  countryCode: string;
  countryName: string;
  countrySlug: string | null;
  imageUrl: string;
  parkType: ParkType;
  note: string | null;
};

export type ProfileWishlistDestination = {
  id: string;
  countryCode: string;
  countryName: string;
  countrySlug: string | null;
};

export type ProfileAllDestinations = {
  countries: ProfileCountryDestination[];
  cities: ProfileTrip[];
  parks: ProfileParkDestination[];
  wishlist: ProfileWishlistDestination[];
};

export function buildProfileAllDestinations(
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  visitedParks: VisitedPark[],
  wishlistCountries: WishlistCountry[],
  visitedCodes: string[],
  residence?: string | null,
  locale: Locale = defaultLocale
): ProfileAllDestinations {
  const residenceCountryCode = resolveResidenceCountryCode(residence);
  const countryList = buildVisitedCountryList(
    visitedCountries,
    visitedCities,
    visitedCodes,
    visitedParks,
    locale
  );

  const visitedByCode = new Map<string, VisitedCountry>();
  for (const country of visitedCountries) {
    visitedByCode.set(country.country_code.toUpperCase(), country);
  }

  const visitedCodeSet = new Set(visitedCodes.map((code) => code.toUpperCase()));

  const citiesByCountry = new Map<string, VisitedCity[]>();
  for (const city of visitedCities) {
    const code = city.country_code.toUpperCase();
    const list = citiesByCountry.get(code) ?? [];
    list.push(city);
    citiesByCountry.set(code, list);
  }

  const parksByCountry = new Map<string, VisitedPark[]>();
  for (const park of visitedParks) {
    const code = park.country_code.toUpperCase();
    const list = parksByCountry.get(code) ?? [];
    list.push(park);
    parksByCountry.set(code, list);
  }

  const lastPinnedByCode = new Map<string, number>();
  for (const country of countryList) {
    const code = country.code.toUpperCase();
    lastPinnedByCode.set(
      code,
      new Date(
        countryLastPinnedAt(code, visitedByCode, citiesByCountry, parksByCountry)
      ).getTime()
    );
  }

  const countries: ProfileCountryDestination[] = deprioritizeResidenceCountry(
    countryList.map((country) => {
      const code = country.code.toUpperCase();
      const cities = citiesByCountry.get(code) ?? [];
      const parks = parksByCountry.get(code) ?? [];

      return {
        code: country.code,
        name: country.name,
        countrySlug: countryHubSlug(country.code),
        cityCount: cities.length,
        parkCount: parks.length,
        visitedId: visitedByCode.get(code)?.id,
        visitedViaPlacesOnly: visitedCodeSet.has(code) && !visitedByCode.has(code),
      };
    }),
    residenceCountryCode,
    (country) => country.code,
    (a, b) =>
      (lastPinnedByCode.get(b.code.toUpperCase()) ?? 0) -
      (lastPinnedByCode.get(a.code.toUpperCase()) ?? 0)
  );

  const parks: ProfileParkDestination[] = deprioritizeResidenceCountry(
    [...visitedParks]
      .sort((a, b) => a.park_name.localeCompare(b.park_name, undefined, { sensitivity: "base" }))
      .map((park) => ({
        id: park.id,
        parkName: formatCityDisplayName(park.park_name),
        parkSlug: findParkHubSlug(park.park_name, park.country_code),
        countryCode: park.country_code,
        countryName: getCountryName(park.country_code, locale),
        countrySlug: countryHubSlug(park.country_code),
        imageUrl: getDefaultParkHeroImage(park.park_type),
        parkType: park.park_type,
        note: park.note,
      })),
    residenceCountryCode,
    (park) => park.countryCode,
    (a, b) => a.parkName.localeCompare(b.parkName, undefined, { sensitivity: "base" })
  );

  const wishlist: ProfileWishlistDestination[] = [...wishlistCountries]
    .sort((a, b) =>
      getCountryName(a.country_code, locale).localeCompare(
        getCountryName(b.country_code, locale),
        locale === "tr" ? "tr" : "en",
        { sensitivity: "base" }
      )
    )
    .map((country) => ({
      id: country.id,
      countryCode: country.country_code,
      countryName: getCountryName(country.country_code, locale),
      countrySlug: countryHubSlug(country.country_code),
    }));

  return {
    countries,
    cities: buildProfileTrips(
      visitedCountries,
      visitedCities,
      [],
      residence,
      visitedCodes,
      locale
    ).filter((trip) => trip.kind === "city"),
    parks,
    wishlist,
  };
}
