import { Link } from "@/lib/i18n/navigation";
import type { HubPinStatItem } from "@/components/hub/HubPagePinCount";
import { CountryPageActions } from "@/components/country/CountryPageActions";
import { CountryPageNav } from "@/components/country/CountryPageNav";
import { CountryPagePinStatsBlock } from "@/components/country/CountryPagePinStatsBlock";
import { HubPageListingSections } from "@/components/hub/HubPageListingSections";
import { HubPageTopBar } from "@/components/hub/HubPageTopBar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { cityPath } from "@/lib/seo/site";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import type { CountryHub } from "@/lib/data/country-hubs";
import type { CountryVisitorState } from "@/lib/data/country-visitor-state";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type CountryPageContentProps = {
  hub: CountryHub;
  capitalCitySlug: string | null;
  travelers: CountryTraveler[];
  wishlistTravelers?: CountryTraveler[];
  memoryPins: HubTravelerPin[];
  visitorState: CountryVisitorState;
  editOwnerCity: VisitedCity | null;
  editOwnerPark: VisitedPark | null;
  visitedCountries: VisitedCountry[];
  loginHref: string;
  pinCountItems?: HubPinStatItem[];
  labels: {
    home: string;
    visited: string;
    wantToVisit: string;
    like: string;
    countryAdded: string;
    countryRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
    removePlacesFirst: string;
    capital: string;
    currency: string;
    plugType: string;
    visa: string;
    language: string;
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
    pinCountry: string;
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

export function CountryPageContent({
  hub,
  capitalCitySlug,
  travelers,
  wishlistTravelers = [],
  memoryPins,
  visitorState,
  editOwnerCity,
  editOwnerPark,
  visitedCountries,
  loginHref,
  pinCountItems = [],
  labels,
}: CountryPageContentProps) {
  const flagUrl = countryCodeToFlagUrl(hub.code);
  const featuredPin = memoryPins[0] ?? null;
  const hasOwnerPin = Boolean(editOwnerCity || editOwnerPark);

  const rows = [
    {
      label: labels.capital,
      value: capitalCitySlug ? (
        <Link href={cityPath(capitalCitySlug)} className="city-page__link">
          {hub.capital}
        </Link>
      ) : (
        hub.capital
      ),
    },
    { label: labels.currency, value: hub.currency },
    { label: labels.plugType, value: hub.plugType },
    { label: labels.visa, value: hub.visaNote },
    { label: labels.language, value: hub.language },
  ];

  return (
    <div className="city-page">
      <HubPageTopBar>
        <CountryPageNav hub={hub} labels={labels} />
      </HubPageTopBar>

      <div className="city-page__container">
        <section className="city-page__hero city-page__hero--park-card">
          <div className="city-page__park-card-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl} alt="" width={220} />
          </div>

          <div>
            <h1 className="city-page__title">{hub.name}</h1>
            <CountryPageActions
              countryCode={hub.code}
              visitorState={visitorState}
              loginHref={loginHref}
              labels={labels}
            />
            <CountryPagePinStatsBlock pinCountItems={pinCountItems} />
          </div>
        </section>

        <section className="city-page__sheet" aria-label="Country details">
          {rows.map((row) => (
            <div key={row.label} className="city-page__row">
              <span className="city-page__label">{row.label}</span>
              <div className="city-page__value">{row.value}</div>
            </div>
          ))}
        </section>

        <HubPageListingSections
          hubName={hub.name}
          travelers={travelers}
          wishlistTravelers={wishlistTravelers}
          memoryPins={memoryPins}
          loginHref={loginHref}
          isLoggedIn={visitorState.isLoggedIn}
          hasOwnerPin={visitorState.isOnMap}
          canEditMedia={hasOwnerPin}
          visitedCountries={visitedCountries}
          ownerCity={editOwnerCity}
          ownerPark={editOwnerPark}
          headingIds={{
            travelers: "country-travelers-heading",
            wishlist: "country-wishlist-heading",
            photos: "country-photos-heading",
            instagram: "country-instagram-heading",
          }}
          labels={{
            recentTravelers: labels.recentTravelers,
            noTravelersYet: labels.noTravelersYet,
            wantTravelers: labels.wantTravelers,
            noWantTravelersYet: labels.noWantTravelersYet,
            pinCta: labels.pinCountry,
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
