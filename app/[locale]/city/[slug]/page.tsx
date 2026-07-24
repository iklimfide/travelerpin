import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CityPageContent } from "@/components/city/CityPageContent";
import { listFeaturedCityHubSlugs } from "@/lib/data/city-hubs";
import { TOURIST_CITIES } from "@/lib/data/tourist-cities";
import { loadCityPageUserState } from "@/lib/supabase/city-visitor-state";
import { loadPublicCityHubContext } from "@/lib/supabase/city-hub-access";
import { loadPublishedParkKeys, touristParkIsPubliclyLinked } from "@/lib/supabase/park-hub-access";
import { findPublishedHubSlugRedirect } from "@/lib/supabase/published-hubs";
import { getDemoPinsForCityHub, mergeDemoHubPins } from "@/lib/data/demo-hub-pins";
import { getCachedCityPinnerCount } from "@/lib/supabase/city-travelers";
import {
  countHubMediaItems,
  mergeOwnerHubPin,
  pinsWithContent,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";
import {
  countCountryWishlisters,
  fetchRecentCountryWishlisters,
} from "@/lib/supabase/country-pin-count";
import { getCachedRecentCityPinsWithPreviews } from "@/lib/supabase/city-travelers-cache";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isKamikazeMasterUser } from "@/lib/kamikaze/master";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
import { cityPath, cityUrl, buildCityPageTitle, DEFAULT_DESCRIPTION } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  PIN_MAP_OG_TITLE,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import { buildLegacyStrippedSlug } from "@/lib/utils/ascii-slug";
import { buildCitySlug } from "@/lib/utils/city-slug";
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
  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const displayName = getLocalizedCityName(hub.countryCode, hub.name, locale);
  const title = buildCityPageTitle(displayName);

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: cityPath(slug) },
    openGraph: {
      title: PIN_MAP_OG_TITLE,
      description: PIN_MAP_OG_DESCRIPTION,
      url: cityUrl(slug),
      images: staticOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: PIN_MAP_OG_TITLE,
      description: PIN_MAP_OG_DESCRIPTION,
      images: staticTwitterImages(),
    },
  };
}

export default async function CityHubPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeCitySlug(rawSlug);
  if (!slug) notFound();

  const supabase = await createClient();

  const redirectedSlug = await findPublishedHubSlugRedirect(supabase, "city", slug);
  if (redirectedSlug) {
    permanentRedirect(cityPath(redirectedSlug));
  }

  const context = await loadPublicCityHubContext(supabase, slug);
  if (!context) {
    const legacyTourist = TOURIST_CITIES.find(
      (city) =>
        buildLegacyStrippedSlug(city.name) === slug && buildCitySlug(city.name) !== slug
    );
    if (legacyTourist) {
      permanentRedirect(cityPath(buildCitySlug(legacyTourist.name)));
    }
    notFound();
  }

  // Prefer ASCII-folded slug (dusseldorf) over legacy stripped ones (d-sseldorf).
  const canonicalSlug = buildCitySlug(context.hub.name);
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(cityPath(canonicalSlug));
  }

  const { hub, touristCity, parks: allParks } = context;
  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const displayName = getLocalizedCityName(hub.countryCode, hub.name, locale);
  const returnPath = cityPath(slug);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;

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

  // Trust unstable_cache pins; mergeOwnerHubPin overlays a fresh owner pin when needed.
  const cityPins = cachedCityPins;

  const demoPins = getDemoPinsForCityHub(hub);
  const hubPins = mergeOwnerHubPin(mergeDemoHubPins(cityPins, demoPins), ownerHubPin);
  const memoryPins = pinsWithContent(hubPins);
  const travelers = uniqueHubTravelers(hubPins);
  const mediaCounts = countHubMediaItems(hubPins);
  const pinCount = Math.max(await getCachedCityPinnerCount(hub), travelers.length);
  const [wishlistCount, wishlistTravelers] = await Promise.all([
    countCountryWishlisters(supabase, hub.countryCode),
    fetchRecentCountryWishlisters(supabase, hub.countryCode),
  ]);
  const pinCountItems: { label: string; href?: string }[] =
    pinCount > 0
      ? [
          {
            label: t("travelersPinned", { count: pinCount }),
            href: "#city-travelers-heading",
          },
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
            href: "#city-wishlist-heading",
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
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
            href: "#city-wishlist-heading",
          },
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
    parksInCity: t("parksInCity", { city: displayName }),
    viewTravelMap: t("viewTravelMap"),
    viewPin: t("viewPin"),
    close: t("closePin"),
    instagramPost: t("instagramPost"),
    editYourPin: t("editYourPin"),
    editYourPinSaved: t("editYourPinSaved"),
    recentTravelers: t("recentTravelers", { city: displayName }),
    noTravelersYet: t("noTravelersYet", { city: displayName }),
    wantTravelers: t("wantTravelers", { city: displayName }),
    noWantTravelersYet: t("noWantTravelersYet"),
    pinCity: t("pinCity", { city: displayName }),
    photosHeading: t("photosHeading"),
    instagramHeading: t("instagramHeading"),
    noInstagramPostsYet: t("noInstagramPostsYet"),
    noPhotosYet: t("noPhotosYet"),
    addYourPhotoCta: t("addYourPhotoCta"),
    addYourInstagramCta: t("addYourInstagramCta"),
    pinItTooCta: t("pinItTooCta"),
    login: tCommon("login"),
    register: tCommon("register"),
    heroModeration: {
      uploadPhoto: t("heroUploadPhoto"),
      importUrl: t("heroImportUrl"),
      removePhoto: t("heroRemovePhoto"),
      importTitle: t("heroImportTitle"),
      importSubtitle: t("heroImportSubtitle"),
      importFieldLabel: t("heroImportFieldLabel"),
      importHint: t("heroImportHint"),
      importUrlRequired: t("heroImportUrlRequired"),
      cancel: tCommon("cancel"),
      submit: t("heroImportSubmit"),
      removeConfirm: t("heroRemoveConfirm"),
      uploadSuccess: t("heroUploadSuccess"),
      removeSuccess: t("heroRemoveSuccess"),
      searchStock: t("heroSearchStock"),
      stockTitle: t("heroStockTitle"),
      stockSubtitle: t("heroStockSubtitle"),
      stockSearch: {
        queryLabel: t("heroStockQueryLabel"),
        search: t("heroStockSearch"),
        searching: t("heroStockSearching"),
        empty: t("heroStockEmpty"),
        noProviders: t("heroStockNoProviders"),
        pick: t("heroStockPick"),
        cancel: tCommon("cancel"),
        photographer: t("heroStockPhotographer"),
        loadMore: t("heroStockLoadMore"),
        noMore: t("heroStockNoMore"),
      },
    },
  };

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <CityPageContent
        hub={hub}
        touristCity={touristCity}
        parks={parks}
        travelers={travelers}
        wishlistTravelers={wishlistTravelers}
        memoryPins={memoryPins}
        visitorState={visitorState}
        ownerCity={ownerCity}
        visitedCountries={visitedCountries}
        canModerateHero={Boolean(user && isKamikazeMasterUser(user))}
        loginHref={loginHref}
        pinCountItems={pinCountItems}
        labels={labels}
      />
    </main>
  );
}
