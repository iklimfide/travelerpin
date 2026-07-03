import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CityPageContent } from "@/components/city/CityPageContent";
import { listFeaturedCityHubSlugs } from "@/lib/data/city-hubs";
import { loadCityPageUserState } from "@/lib/supabase/city-visitor-state";
import { loadPublicCityHubContext } from "@/lib/supabase/city-hub-access";
import { loadPublishedParkKeys, touristParkIsPubliclyLinked } from "@/lib/supabase/park-hub-access";
import { countCityPinners, fetchRecentCityPins } from "@/lib/supabase/city-travelers";
import {
  countHubMediaItems,
  mergeOwnerHubPin,
  pinHasGalleryMedia,
  pinsWithContent,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";
import { countCountryWishlisters } from "@/lib/supabase/country-pin-count";
import { getCachedRecentCityPinsWithPreviews } from "@/lib/supabase/city-travelers-cache";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cityPath, cityUrl, buildCityPageTitle, DEFAULT_DESCRIPTION, getSiteUrl } from "@/lib/seo/site";
import { DEFAULT_CITY_HERO_ALT, DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { sanitizeCitySlug } from "@/lib/utils/sanitize-city-slug";
import "../city-page.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return listFeaturedCityHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = sanitizeCitySlug(rawSlug);
  if (!slug) return { title: "City" };

  const supabase = await createClient();
  const context = await loadPublicCityHubContext(supabase, slug);
  if (!context) return { title: "City not found" };

  const { hub } = context;
  const title = buildCityPageTitle(hub.name);
  const ogImage = `${getSiteUrl()}${DEFAULT_CITY_HERO_IMAGE}`;

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: cityPath(slug) },
    openGraph: {
      title,
      description: DEFAULT_DESCRIPTION,
      url: cityUrl(slug),
      images: [{ url: ogImage, alt: hub.heroImageAlt ?? DEFAULT_CITY_HERO_ALT }],
    },
  };
}

export default async function CityHubPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeCitySlug(rawSlug);
  if (!slug) notFound();

  const supabase = await createClient();
  const context = await loadPublicCityHubContext(supabase, slug);
  if (!context) notFound();

  const { hub, touristCity, parks: allParks } = context;
  const returnPath = cityPath(slug);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;

  const [t, tCommon, cachedCityPins, user] = await Promise.all([
    getTranslations("cityHub"),
    getTranslations("common"),
    getCachedRecentCityPinsWithPreviews(hub),
    getAuthUser(),
  ]);

  const { visitorState, ownerCity, ownerHubPin, visitedCountries } = await loadCityPageUserState(
    supabase,
    user?.id,
    hub
  );

  const publishedParkKeys = await loadPublishedParkKeys(supabase);
  const parks = allParks.filter((park) => touristParkIsPubliclyLinked(park, publishedParkKeys));

  let cityPins = cachedCityPins;
  if (supabase) {
    const freshPins = await fetchRecentCityPins(supabase, hub, 200);
    if (freshPins.length > 0 || (ownerHubPin && pinHasGalleryMedia(ownerHubPin))) {
      cityPins = freshPins;
    }
  }

  const hubPins = mergeOwnerHubPin(cityPins, ownerHubPin);
  const memoryPins = pinsWithContent(hubPins);
  const travelers = uniqueHubTravelers(hubPins);
  const mediaCounts = countHubMediaItems(hubPins);
  const pinCount = await countCityPinners(supabase, hub);
  const wishlistCount = await countCountryWishlisters(supabase, hub.countryCode);
  const pinCountItems: { label: string; href?: string }[] =
    pinCount > 0
      ? [
          {
            label: t("travelersPinned", { count: pinCount }),
            href: "#city-travelers-heading",
          },
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
          },
          {
            label: t("photosAdded", { count: mediaCounts.photos }),
            href: "#city-photos-heading",
          },
          {
            label: t("instagramPostsAdded", { count: mediaCounts.instagramPosts }),
            href: "#city-instagram-heading",
          },
        ]
      : [
          { label: t("noTravelersPinned") },
          { label: t("travelersWantToVisit", { count: wishlistCount }) },
        ];

  const labels = {
    home: t("home"),
    visited: t("visited"),
    wantToVisit: t("wantToVisit"),
    like: t("like"),
    cityAdded: t("cityAdded"),
    cityRemoved: t("cityRemoved"),
    wishlistAdded: t("wishlistAdded"),
    wishlistRemoved: t("wishlistRemoved"),
    alreadyOnMap: t("alreadyOnMap"),
    country: t("country"),
    parksInCity: t("parksInCity", { city: hub.name }),
    viewTravelMap: t("viewTravelMap"),
    viewPin: t("viewPin"),
    close: t("closePin"),
    instagramPost: t("instagramPost"),
    editYourPin: t("editYourPin"),
    editYourPinSaved: t("editYourPinSaved"),
    recentTravelers: t("recentTravelers", { city: hub.name }),
    noTravelersYet: t("noTravelersYet", { city: hub.name }),
    pinCity: t("pinCity", { city: hub.name }),
    photosHeading: t("photosHeading"),
    instagramHeading: t("instagramHeading"),
    noInstagramPostsYet: t("noInstagramPostsYet"),
    noPhotosYet: t("noPhotosYet"),
    addYourPhotoCta: t("addYourPhotoCta"),
    addYourInstagramCta: t("addYourInstagramCta"),
    pinItTooCta: t("pinItTooCta"),
    login: tCommon("login"),
    register: tCommon("register"),
  };

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <CityPageContent
        hub={hub}
        touristCity={touristCity}
        parks={parks}
        travelers={travelers}
        memoryPins={memoryPins}
        visitorState={visitorState}
        ownerCity={ownerCity}
        visitedCountries={visitedCountries}
        loginHref={loginHref}
        registerHref={registerHref}
        pinCountItems={pinCountItems}
        labels={labels}
      />
    </main>
  );
}
