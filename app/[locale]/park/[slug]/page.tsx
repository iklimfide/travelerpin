import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCatalogOverlay, parkNameTrOverrideMap } from "@/lib/kamikaze/catalog-overlay";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedParkName } from "@/lib/i18n/park-place-names";
import { ParkPageContent } from "@/components/park/ParkPageContent";
import { listPopularParkHubSlugs } from "@/lib/data/park-hubs";
import { buildParkPageTitle, DEFAULT_DESCRIPTION, parkPath, parkUrl } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  PIN_MAP_OG_TITLE,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import { getDemoPinsForParkHub, mergeDemoHubPins } from "@/lib/data/demo-hub-pins";
import { getCachedRecentParkPins } from "@/lib/supabase/park-travelers-cache";
import {
  mergeOwnerHubPin,
  pinsWithContent,
  countHubMediaItems,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";
import {
  countCountryWishlisters,
  fetchRecentCountryWishlisters,
} from "@/lib/supabase/country-pin-count";
import { countParkPinners, loadParkPageUserState } from "@/lib/supabase/park-visitor-state";
import { loadPublicParkHubBySlug } from "@/lib/supabase/park-hub-access";
import { findPublishedHubSlugRedirect } from "@/lib/supabase/published-hubs";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isKamikazeMasterUser } from "@/lib/kamikaze/master";
import { buildParkSlug, sanitizeParkSlug } from "@/lib/utils/park-slug";
import "../../city/city-page.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return listPopularParkHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = sanitizeParkSlug(rawSlug);
  if (!slug) return { title: "Park" };

  const supabase = await createClient();
  const hub = await loadPublicParkHubBySlug(supabase, slug);
  if (!hub) return { title: "Park not found" };

  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const overlay = await getCatalogOverlay();
  const displayName = getLocalizedParkName(hub.countryCode, hub.name, locale, {
    parkType: hub.parkType,
    nameTrOverrides: parkNameTrOverrideMap(overlay),
  });
  const title = buildParkPageTitle(displayName);

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: parkPath(slug) },
    openGraph: {
      title: PIN_MAP_OG_TITLE,
      description: PIN_MAP_OG_DESCRIPTION,
      url: parkUrl(slug),
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

export default async function ParkHubPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeParkSlug(rawSlug);
  if (!slug) notFound();

  const supabase = await createClient();

  const redirectedSlug = await findPublishedHubSlugRedirect(supabase, "park", slug);
  if (redirectedSlug) {
    permanentRedirect(parkPath(redirectedSlug));
  }

  const hub = await loadPublicParkHubBySlug(supabase, slug);
  if (!hub) notFound();

  const canonicalSlug = buildParkSlug(hub.name);
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(parkPath(canonicalSlug));
  }

  const returnPath = parkPath(slug);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;

  const [t, tCommon, cachedParkPins, user, localeRaw, overlay] = await Promise.all([
    getTranslations("parkHub"),
    getTranslations("common"),
    getCachedRecentParkPins(hub),
    getAuthUser(),
    getLocale(),
    getCatalogOverlay(),
  ]);
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const displayName = getLocalizedParkName(hub.countryCode, hub.name, locale, {
    parkType: hub.parkType,
    nameTrOverrides: parkNameTrOverrideMap(overlay),
  });

  const { visitorState, ownerPark, ownerHubPin, visitedCountries } = await loadParkPageUserState(
    supabase,
    user?.id,
    hub
  );

  // Trust unstable_cache pins; mergeOwnerHubPin overlays a fresh owner pin when needed.
  const parkPins = cachedParkPins;

  const demoPins = getDemoPinsForParkHub(hub);
  const hubPins = mergeOwnerHubPin(mergeDemoHubPins(parkPins, demoPins), ownerHubPin);
  const memoryPins = pinsWithContent(hubPins);
  const travelers = uniqueHubTravelers(hubPins);
  const mediaCounts = countHubMediaItems(hubPins);
  const pinCount = Math.max(await countParkPinners(supabase, hub), travelers.length);
  const [wishlistCount, wishlistTravelers] = await Promise.all([
    countCountryWishlisters(supabase, hub.countryCode),
    fetchRecentCountryWishlisters(supabase, hub.countryCode),
  ]);
  const pinCountItems: { label: string; href?: string }[] =
    pinCount > 0
      ? [
          {
            label: t("travelersPinned", { count: pinCount }),
            href: "#park-travelers-heading",
          },
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
            href: "#park-wishlist-heading",
          },
          {
            label: t("photosAdded", { count: mediaCounts.photos }),
            href: "#park-photos-heading",
          },
          {
            label: t("instagramPostsAdded", { count: mediaCounts.instagramPosts }),
            href: "#park-instagram-heading",
          },
        ]
      : [
          { label: t("noTravelersPinned") },
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
            href: "#park-wishlist-heading",
          },
        ];

  const labels = {
    home: t("home"),
    visited: t("visited"),
    wantToVisit: t("wantToVisit"),
    like: t("like"),
    country: t("country"),
    parkType: t("parkType"),
    parkAdded: t("parkAdded"),
    parkRemoved: t("parkRemoved"),
    wishlistAdded: t("wishlistAdded"),
    wishlistRemoved: t("wishlistRemoved"),
    travelerMemories: t("travelerMemories", { park: displayName }),
    viewTravelMap: t("viewTravelMap"),
    viewPin: t("viewPin"),
    close: t("closePin"),
    instagramPost: t("instagramPost"),
    editYourPin: t("editYourPin"),
    editYourPinSaved: t("editYourPinSaved"),
    recentTravelers: t("recentTravelers", { park: displayName }),
    noTravelersYet: t("noTravelersYet", { park: displayName }),
    wantTravelers: t("wantTravelers", { park: displayName }),
    noWantTravelersYet: t("noWantTravelersYet"),
    pinPark: t("pinPark", { park: displayName }),
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
      <ParkPageContent
        hub={hub}
        displayName={displayName}
        travelers={travelers}
        wishlistTravelers={wishlistTravelers}
        memoryPins={memoryPins}
        visitorState={visitorState}
        ownerPark={ownerPark}
        visitedCountries={visitedCountries}
        canModerateHero={Boolean(user && isKamikazeMasterUser(user))}
        loginHref={loginHref}
        pinCountItems={pinCountItems}
        labels={labels}
      />
    </main>
  );
}
