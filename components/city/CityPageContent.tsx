import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import type { HubPinStatItem } from "@/components/hub/HubPagePinCount";
import { CityPageNav } from "@/components/city/CityPageNav";
import { CityPageActions } from "@/components/city/CityPageActions";
import { CityPagePinStatsBlock } from "@/components/city/CityPagePinStatsBlock";
import { HubPageListingSections } from "@/components/hub/HubPageListingSections";
import { HubPageTopBar } from "@/components/hub/HubPageTopBar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ensureParkHubFromTouristPark } from "@/lib/data/park-hubs";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { countryPath, parkPath } from "@/lib/seo/site";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import type { CityHub } from "@/lib/data/city-hubs";
import type { TouristCity } from "@/lib/data/tourist-cities";
import type { TouristPark } from "@/lib/data/tourist-park-search";
import type { CityVisitorState } from "@/lib/data/city-visitor-state";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { VisitedCity, VisitedCountry } from "@/types/database";

type CityPageContentProps = {
  hub: CityHub;
  touristCity: TouristCity | null;
  parks: TouristPark[];
  travelers: CountryTraveler[];
  wishlistTravelers?: CountryTraveler[];
  memoryPins: HubTravelerPin[];
  visitorState: CityVisitorState;
  ownerCity: VisitedCity | null;
  visitedCountries: VisitedCountry[];
  loginHref: string;
  pinCountItems?: HubPinStatItem[];
  labels: {
    home: string;
    visited: string;
    wantToVisit: string;
    like: string;
    cityAdded: string;
    cityRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
    alreadyOnMap: string;
    country: string;
    parksInCity: string;
    viewTravelMap: string;
    viewPin: string;
    close: string;
    instagramPost: string;
    editYourPin: string;
    editYourPinSaved: string;
    recentTravelers: string;
    noTravelersYet: string;
    wantTravelers: string;
    noWantTravelersYet: string;
    pinCity: string;
    photosHeading: string;
    instagramHeading: string;
    noInstagramPostsYet: string;
    noPhotosYet: string;
    addYourPhotoCta: string;
    addYourInstagramCta: string;
    pinItTooCta: string;
    login: string;
    register: string;
  };
};

export function CityPageContent({
  hub,
  touristCity,
  parks,
  travelers,
  wishlistTravelers = [],
  memoryPins,
  visitorState,
  ownerCity,
  visitedCountries,
  loginHref,
  pinCountItems = [],
  labels,
}: CityPageContentProps) {
  const heroUrl = DEFAULT_CITY_HERO_IMAGE;
  const featuredPin = memoryPins[0] ?? null;

  const rows: { label: string; value: ReactNode }[] = [];

  rows.push({
    label: labels.country,
    value: (
      <Link href={countryPath(hub.countrySlug)} className="city-page__link">
        {hub.countryName}
      </Link>
    ),
  });

  if (parks.length > 0) {
    rows.push({
      label: labels.parksInCity,
      value: (
        <ul className="m-0 list-none p-0">
          {parks.map((park) => {
            const parkHub = ensureParkHubFromTouristPark(park);
            return (
              <li key={`${park.parkType}:${park.name}`} className="py-1 first:pt-0 last:pb-0">
                <Link href={parkPath(parkHub.slug)} className="city-page__link">
                  {park.name}
                </Link>
                <span className="city-page__subtext">{parkTypeLabel(park.parkType)}</span>
              </li>
            );
          })}
        </ul>
      ),
    });
  }

  return (
    <div className="city-page">
      <HubPageTopBar>
        <CityPageNav hub={hub} labels={labels} />
      </HubPageTopBar>

      <div className="city-page__container">
        <section className="city-page__hero city-page__hero--park-card">
          <div className="city-page__park-card-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="" width={220} />
          </div>

          <div>
            <h1 className="city-page__title">{hub.name}</h1>
            <CityPageActions
              cityName={hub.name}
              countryCode={hub.countryCode}
              countryName={hub.countryName}
              latitude={touristCity?.latitude ?? null}
              longitude={touristCity?.longitude ?? null}
              visitorState={visitorState}
              loginHref={loginHref}
              labels={labels}
            />
            <CityPagePinStatsBlock pinCountItems={pinCountItems} />
          </div>
        </section>

        {rows.length > 0 ? (
          <section className="city-page__sheet" aria-label="City details">
            {rows.map((row) => (
              <div key={row.label} className="city-page__row">
                <span className="city-page__label">{row.label}</span>
                <div className="city-page__value">{row.value}</div>
              </div>
            ))}
          </section>
        ) : null}

        <HubPageListingSections
          hubName={hub.name}
          travelers={travelers}
          wishlistTravelers={wishlistTravelers}
          memoryPins={memoryPins}
          loginHref={loginHref}
          isLoggedIn={visitorState.isLoggedIn}
          hasOwnerPin={Boolean(ownerCity)}
          canEditMedia={Boolean(ownerCity)}
          visitedCountries={visitedCountries}
          ownerCity={ownerCity}
          headingIds={{
            travelers: "city-travelers-heading",
            wishlist: "city-wishlist-heading",
            photos: "city-photos-heading",
            instagram: "city-instagram-heading",
          }}
          labels={{
            recentTravelers: labels.recentTravelers,
            noTravelersYet: labels.noTravelersYet,
            wantTravelers: labels.wantTravelers,
            noWantTravelersYet: labels.noWantTravelersYet,
            pinCta: labels.pinCity,
            pinItTooCta: labels.pinItTooCta,
            photosHeading: labels.photosHeading,
            instagramHeading: labels.instagramHeading,
            noInstagramPostsYet: labels.noInstagramPostsYet,
            noPhotosYet: labels.noPhotosYet,
            addYourPhotoCta: labels.addYourPhotoCta,
            addYourInstagramCta: labels.addYourInstagramCta,
            viewPin: labels.viewPin,
            viewMap: labels.viewTravelMap,
            close: labels.close,
            instagramPost: labels.instagramPost,
          }}
        />

        {featuredPin?.note ? (
          <section className="city-page__featured-pin" aria-label={labels.viewPin}>
            <Link href={featuredPin.profilePath} className="city-page__featured-pin-author">
              <ProfileAvatar
                avatarUrl={featuredPin.avatarUrl}
                displayName={featuredPin.displayName}
                username={featuredPin.username}
                size="sm"
              />
              <div className="min-w-0">
                <p className="city-page__traveler-name">{featuredPin.displayName}</p>
                <p className="city-page__traveler-handle">@{featuredPin.username}</p>
              </div>
            </Link>
            <p className="city-page__featured-pin-note">{featuredPin.note}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
