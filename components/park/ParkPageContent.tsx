import Link from "next/link";
import type { HubPinStatItem } from "@/components/hub/HubPagePinCount";
import { HubPageListingSections } from "@/components/hub/HubPageListingSections";
import { HubPageTopBar } from "@/components/hub/HubPageTopBar";
import { ParkPageActions } from "@/components/park/ParkPageActions";
import { ParkPageNav } from "@/components/park/ParkPageNav";
import { ParkPagePinStatsBlock } from "@/components/park/ParkPagePinStatsBlock";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { countryPath, parkCategoryPath, parkPath } from "@/lib/seo/site";
import { parkCategorySlugForParkType } from "@/lib/utils/park-category";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { ParkHub } from "@/lib/data/park-hubs";
import type { ParkVisitorState } from "@/lib/data/park-visitor-state";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import type { VisitedCountry, VisitedPark } from "@/types/database";

type ParkPageContentProps = {
  hub: ParkHub;
  travelers: CountryTraveler[];
  wishlistTravelers?: CountryTraveler[];
  memoryPins: HubTravelerPin[];
  visitorState: ParkVisitorState;
  ownerPark: VisitedPark | null;
  visitedCountries: VisitedCountry[];
  loginHref: string;
  pinCountItems?: HubPinStatItem[];
  labels: {
    home: string;
    visited: string;
    wantToVisit: string;
    like: string;
    country: string;
    parkType: string;
    parkAdded: string;
    parkRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
    travelerMemories: string;
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
    pinPark: string;
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

export function ParkPageContent({
  hub,
  travelers,
  wishlistTravelers = [],
  memoryPins,
  visitorState,
  ownerPark,
  visitedCountries,
  loginHref,
  pinCountItems = [],
  labels,
}: ParkPageContentProps) {
  const heroUrl = getDefaultParkHeroImage(hub.parkType);
  const featuredPin = memoryPins[0] ?? null;

  const rows = [
    {
      label: labels.country,
      value: (
        <Link href={countryPath(hub.countrySlug)} className="city-page__link">
          {hub.countryName}
        </Link>
      ),
    },
    {
      label: labels.parkType,
      value: (
        <Link
          href={parkCategoryPath(parkCategorySlugForParkType(hub.parkType))}
          className="city-page__link"
        >
          {parkTypeLabel(hub.parkType)}
        </Link>
      ),
    },
  ];

  return (
    <div className="city-page">
      <HubPageTopBar>
        <ParkPageNav hub={hub} labels={{ home: labels.home }} />
      </HubPageTopBar>

      <div className="city-page__container">
        <section className="city-page__hero city-page__hero--park-card">
          <div className="city-page__park-card-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="" width={220} />
          </div>

          <div>
            <h1 className="city-page__title">{hub.name}</h1>
            <ParkPageActions
              parkName={hub.name}
              parkType={hub.parkType}
              countryCode={hub.countryCode}
              countryName={hub.countryName}
              latitude={hub.latitude}
              longitude={hub.longitude}
              visitorState={visitorState}
              loginHref={loginHref}
              labels={labels}
            />
            <ParkPagePinStatsBlock pinCountItems={pinCountItems} />
          </div>
        </section>

        <section className="city-page__sheet" aria-label="Park details">
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
          hasOwnerPin={Boolean(ownerPark)}
          canEditMedia={Boolean(ownerPark)}
          visitedCountries={visitedCountries}
          ownerPark={ownerPark}
          headingIds={{
            travelers: "park-travelers-heading",
            wishlist: "park-wishlist-heading",
            photos: "park-photos-heading",
            instagram: "park-instagram-heading",
          }}
          labels={{
            recentTravelers: labels.recentTravelers,
            noTravelersYet: labels.noTravelersYet,
            wantTravelers: labels.wantTravelers,
            noWantTravelersYet: labels.noWantTravelersYet,
            pinCta: labels.pinPark,
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
