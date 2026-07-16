export type MediaType = "photo" | "instagram";

export type ParkType = "national_park" | "theme_park" | "botanical_garden";

export const PARK_TYPES = ["national_park", "theme_park", "botanical_garden"] as const satisfies readonly ParkType[];

export type SharePromptMode = "every_pin" | "after_30m" | "never";

export type NextRouteStopKind = "country" | "city";

export type NextRouteStop = {
  id: string;
  kind: NextRouteStopKind;
  name: string;
  countryCode?: string;
  countryName?: string;
  slug?: string | null;
  href?: string | null;
};

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  residence: string | null;
  instagram_url: string | null;
  profession: string | null;
  marital_status: string | null;
  wishlist_public: boolean;
  share_prompt_mode: SharePromptMode;
  next_route?: NextRouteStop[];
  banned_at?: string | null;
  ban_reason?: string | null;
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

export type NotificationType =
  | "follow"
  | "pin_country"
  | "pin_city"
  | "pin_park"
  | "pin_media"
  | "system";

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface EnrichedNotificationRow extends NotificationRow {
  actorProfile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ProfileFollowState {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export interface ProfileFollowerSummary {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string;
  profilePath: string;
}

export type ProfileFollowListType = "followers" | "following";
