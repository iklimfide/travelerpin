export type MediaType = "photo" | "instagram";

export type ParkType = "national_park" | "theme_park" | "botanical_garden";

export const PARK_TYPES = ["national_park", "theme_park", "botanical_garden"] as const satisfies readonly ParkType[];

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  residence: string | null;
  profession: string | null;
  marital_status: string | null;
  wishlist_public: boolean;
  created_at: string;
}

export interface VisitedCountry {
  id: string;
  user_id: string;
  country_code: string;
  country_name: string;
  created_at: string;
}

export interface WishlistCountry {
  id: string;
  user_id: string;
  country_code: string;
  country_name: string;
  created_at: string;
}

export interface VisitedCity {
  id: string;
  user_id: string;
  city_name: string;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  photo_url: string | null;
  instagram_urls: string[];
  media_type: MediaType | null;
  media_url: string | null;
  media_preview_url: string | null;
  visit_dates: string[];
  created_at: string;
  updated_at: string;
}

export interface VisitedPark {
  id: string;
  user_id: string;
  park_name: string;
  park_type: ParkType;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  photo_url: string | null;
  instagram_urls: string[];
  media_type: MediaType | null;
  media_url: string | null;
  visit_dates: string[];
  created_at: string;
  updated_at: string;
}

export interface TravelStats {
  countries: number;
  cities: number;
  nationalParks: number;
  themeParks: number;
}
