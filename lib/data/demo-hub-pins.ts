import type { CityHub } from "@/lib/data/city-hubs";
import type { ParkHub } from "@/lib/data/park-hubs";
import {
  DEMO_PROFILE,
  getDemoVisitedCities,
  getDemoVisitedParks,
} from "@/lib/data/jennifer-demo-page";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import { visitedCityToHubPin } from "@/lib/supabase/city-travelers";
import {
  createHubTravelerPin,
  sortHubTravelerPins,
  type HubTravelerPin,
} from "@/lib/supabase/hub-traveler-pin";
import { visitedParkToHubPin } from "@/lib/supabase/park-travelers";
import { profilePath } from "@/lib/seo/site";
import { cityPlacePath, parkPlacePath } from "@/lib/utils/hub-place-path";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

function demoOwnerProfile() {
  return {
    username: DEMO_PROFILE.username,
    display_name: DEMO_PROFILE.display_name,
    avatar_url: DEMO_PROFILE.avatar_url,
    instagram_url: DEMO_PROFILE.instagram_url,
  };
}

/** Jennifer's pin for a city hub (e.g. /city/los-angeles), if she visited it. */
export function getDemoPinsForCityHub(hub: CityHub): HubTravelerPin[] {
  const profile = demoOwnerProfile();
  return getDemoVisitedCities()
    .map((city) => visitedCityToHubPin(city, hub, profile))
    .filter((pin): pin is HubTravelerPin => pin !== null);
}

/** Jennifer's pins for a country hub (cities + parks in that country). */
export function getDemoPinsForCountry(countryCode: string): HubTravelerPin[] {
  const code = countryCode.toUpperCase();
  const profile = demoOwnerProfile();
  const username = profile.username.toLowerCase();
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);

  const cityPins = getDemoVisitedCities()
    .filter((city) => city.country_code.toUpperCase() === code)
    .map((city) =>
      createHubTravelerPin({
        id: `city:${city.id}`,
        placeLabel: city.city_name,
        placePath: cityPlacePath(city.country_code, city.city_name),
        note: city.note,
        mediaRow: city,
        mediaPreviewUrl: city.media_preview_url,
        visitDates: city.visit_dates ?? [],
        pinnedAt: city.updated_at || city.created_at,
        username,
        displayName,
        avatarUrl: profile.avatar_url,
        instagramProfileUrl: profile.instagram_url,
        profilePath: profilePath(username),
      })
    );

  const parkPins = getDemoVisitedParks()
    .filter((park) => park.country_code.toUpperCase() === code)
    .map((park) =>
      createHubTravelerPin({
        id: `park:${park.id}`,
        placeLabel: park.park_name,
        placePath: parkPlacePath(park.park_name, park.country_code),
        note: park.note,
        mediaRow: park,
        visitDates: park.visit_dates ?? [],
        pinnedAt: park.updated_at || park.created_at,
        username,
        displayName,
        avatarUrl: profile.avatar_url,
        instagramProfileUrl: profile.instagram_url,
        profilePath: profilePath(username),
      })
    );

  return sortHubTravelerPins([...cityPins, ...parkPins]);
}

/** Jennifer's pin for a park hub, if she visited it. */
export function getDemoPinsForParkHub(hub: ParkHub): HubTravelerPin[] {
  const profile = demoOwnerProfile();
  return getDemoVisitedParks()
    .map((park) => visitedParkToHubPin(park, hub, profile))
    .filter((pin): pin is HubTravelerPin => pin !== null);
}

/** Jennifer as a country traveler card, if she has any pin in that country. */
export function getDemoTravelerForCountry(countryCode: string): CountryTraveler | null {
  const pins = getDemoPinsForCountry(countryCode);
  if (pins.length === 0) return null;

  const latest = pins[0];
  return {
    username: latest.username,
    displayName: latest.displayName,
    avatarUrl: latest.avatarUrl,
    lastPinnedAt: latest.pinnedAt,
    profilePath: latest.profilePath,
  };
}

/** Prepend demo pins when the real user is not already in the list. */
export function mergeDemoHubPins(
  pins: HubTravelerPin[],
  demoPins: HubTravelerPin[]
): HubTravelerPin[] {
  if (demoPins.length === 0) return pins;

  const existingUsers = new Set(pins.map((pin) => pin.username.toLowerCase()));
  const extra = demoPins.filter(
    (pin) => !existingUsers.has(pin.username.toLowerCase())
  );
  if (extra.length === 0) return pins;

  return sortHubTravelerPins([...extra, ...pins]);
}

export function mergeDemoCountryTravelers(
  travelers: CountryTraveler[],
  countryCode: string
): CountryTraveler[] {
  const demo = getDemoTravelerForCountry(countryCode);
  if (!demo) return travelers;
  if (travelers.some((traveler) => traveler.username.toLowerCase() === demo.username)) {
    return travelers;
  }
  return [demo, ...travelers];
}

/** Whether Jennifer's demo map includes this city name in the country. */
export function demoPersonaPinnedCity(countryCode: string, cityName: string): boolean {
  const code = countryCode.toUpperCase();
  const nameKey = normalizeCityKey(cityName);
  return getDemoVisitedCities().some(
    (city) =>
      city.country_code.toUpperCase() === code &&
      normalizeCityKey(city.city_name) === nameKey
  );
}
