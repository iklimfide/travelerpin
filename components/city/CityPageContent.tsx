import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { HubPinStatItem } from "@/components/hub/HubPagePinCount";
import { CityPageNav } from "@/components/city/CityPageNav";
import { CityPageActions } from "@/components/city/CityPageActions";
import { CityPagePinStatsBlock } from "@/components/city/CityPagePinStatsBlock";
import { HubHeroImageMasterModeration } from "@/components/hub/HubHeroImageMasterModeration";
import { HubPageListingSections } from "@/components/hub/HubPageListingSections";
import { HubPageTopBar } from "@/components/hub/HubPageTopBar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { getCountryName } from "@/lib/data/countries";
import { ensureParkHubFromTouristPark } from "@/lib/data/park-hubs";
import { getCityHeroImageUrl } from "@/lib/city/city-hero-images";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
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
  canModerateHero: boolean;
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
    heroModeration: {
      uploadPhoto: string;
      importUrl: string;
      removePhoto: string;
      importTitle: string;
      importSubtitle: string;
      importFieldLabel: string;
      importHint: string;
      importUrlRequired: string;
      cancel: string;
      submit: string;
      removeConfirm: string;
      uploadSuccess: string;
      removeSuccess: string;
    };
  };
};

export async function CityPageContent({
  hub,
  touristCity,
  parks,
  travelers,
  wishlistTravelers = [],
  memoryPins,
  visitorState,
  ownerCity,
  visitedCountries,
  canModerateHero,
  loginHref,
  pinCountItems = [],
  labels,
}: CityPageContentProps) {
  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const displayName = getLocalizedCityName(hub.countryCode, hub.name, locale);
  const countryDisplayName = getCountryName(hub.countryCode, locale);
  const heroUrl = await getCityHeroImageUrl(hub.countryCode, hub.name);
  const featuredPin = memoryPins[0] ?? null;

  const rows: { label: string; value: ReactNode }[] = [];

  rows.push({
    label: labels.country,
    value: (
      <Link href={countryPath(hub.countrySlug)} className="city-page__link">
        {countryDisplayName}
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
                <Link href={parkPath(parkHub.slug)} className="city-page__link" prefetch={false}>
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
        <CityPageNav
          hub={hub}
          displayName={displayName}
          countryDisplayName={countryDisplayName}
          labels={labels}
        />
      </HubPageTopBar>

      <div className="city-page__container">
        <section className="city-page__hero city-page__hero--park-card">
          <HubHeroImageMasterModeration
            kind="city"
            countryCode={hub.countryCode}
            placeName={hub.name}
            initialImageUrl={heroUrl}
            canModerate={canModerateHero}
            labels={labels.heroModeration}
          />

          <div>
            <h1 className="city-page__title">{displayName}</h1>
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
          hubName={displayName}
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
