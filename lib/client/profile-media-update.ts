import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";
import { readInstagramUrls, readPhotoUrls } from "@/lib/utils/pin-media";
import type { VisitedCity, VisitedPark } from "@/types/database";

function filterInstagramUrl(urls: string[], toRemove: string): string[] {
  const target = normalizeInstagramPostUrl(toRemove).toLowerCase();
  return urls.filter((url) => normalizeInstagramPostUrl(url).toLowerCase() !== target);
}

function cityMediaPatchPayload(
  city: VisitedCity,
  overrides: {
    photo_url?: string | null;
    photo_urls?: string[];
    instagram_urls?: string[];
    clearLegacyMedia?: boolean;
  }
) {
  const photoUrls =
    overrides.photo_urls !== undefined ? overrides.photo_urls : readPhotoUrls(city);

  return {
    city_name: city.city_name,
    country_code: city.country_code,
    country_name: city.country_name,
    note: city.note,
    photo_url:
      overrides.photo_url !== undefined ? overrides.photo_url : photoUrls[0] ?? null,
    photo_urls: photoUrls,
    instagram_urls:
      overrides.instagram_urls !== undefined
        ? overrides.instagram_urls
        : readInstagramUrls(city),
    visit_dates: city.visit_dates ?? [],
    ...(overrides.clearLegacyMedia ? { media_type: null, media_url: null } : {}),
  };
}

function parkMediaPatchPayload(
  park: VisitedPark,
  overrides: {
    photo_url?: string | null;
    photo_urls?: string[];
    instagram_urls?: string[];
    clearLegacyMedia?: boolean;
  }
) {
  const photoUrls =
    overrides.photo_urls !== undefined ? overrides.photo_urls : readPhotoUrls(park);

  return {
    park_name: park.park_name,
    park_type: park.park_type,
    country_code: park.country_code,
    country_name: park.country_name,
    note: park.note,
    photo_url:
      overrides.photo_url !== undefined ? overrides.photo_url : photoUrls[0] ?? null,
    photo_urls: photoUrls,
    instagram_urls:
      overrides.instagram_urls !== undefined
        ? overrides.instagram_urls
        : readInstagramUrls(park),
    visit_dates: park.visit_dates ?? [],
    ...(overrides.clearLegacyMedia ? { media_type: null, media_url: null } : {}),
  };
}

export async function removeCityPhoto(city: VisitedCity, photoUrl?: string): Promise<Response> {
  const current = readPhotoUrls(city);
  const next = photoUrl ? current.filter((url) => url !== photoUrl) : [];

  return fetch(`/api/cities/${city.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      cityMediaPatchPayload(city, {
        photo_urls: next,
        photo_url: next[0] ?? null,
        clearLegacyMedia: next.length === 0,
      })
    ),
  });
}

export async function removeParkPhoto(park: VisitedPark, photoUrl?: string): Promise<Response> {
  const current = readPhotoUrls(park);
  const next = photoUrl ? current.filter((url) => url !== photoUrl) : [];

  return fetch(`/api/parks/${park.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      parkMediaPatchPayload(park, {
        photo_urls: next,
        photo_url: next[0] ?? null,
        clearLegacyMedia: next.length === 0,
      })
    ),
  });
}

export async function removeCityInstagramUrl(
  city: VisitedCity,
  url: string
): Promise<Response> {
  return fetch(`/api/cities/${city.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      cityMediaPatchPayload(city, {
        instagram_urls: filterInstagramUrl(readInstagramUrls(city), url),
      })
    ),
  });
}

export async function removeParkInstagramUrl(
  park: VisitedPark,
  url: string
): Promise<Response> {
  return fetch(`/api/parks/${park.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      parkMediaPatchPayload(park, {
        instagram_urls: filterInstagramUrl(readInstagramUrls(park), url),
      })
    ),
  });
}
