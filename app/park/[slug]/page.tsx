import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { fetchRecentParkPins } from "@/lib/supabase/park-travelers";
import {
  mergeOwnerHubPin,
  pinsWithContent,
  countHubMediaItems,
  pinHasGalleryMedia,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";
import {
  countCountryWishlisters,
  fetchRecentCountryWishlisters,
} from "@/lib/supabase/country-pin-count";
import { countParkPinners, loadParkPageUserState } from "@/lib/supabase/park-visitor-state";
import { loadPublicParkHubBySlug } from "@/lib/supabase/park-hub-access";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { sanitizeParkSlug } from "@/lib/utils/park-slug";
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

  const title = buildParkPageTitle(hub.name);

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
  const hub = await loadPublicParkHubBySlug(supabase, slug);
  if (!hub) notFound();

  const returnPath = parkPath(slug);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;

  const [t, tCommon, cachedParkPins, user] = await Promise.all([
    getTranslations("parkHub"),
    getTranslations("common"),
    getCachedRecentParkPins(hub),
    getAuthUser(),
  ]);

  const { visitorState, ownerPark, ownerHubPin, visitedCountries } = await loadParkPageUserState(
    supabase,
    user?.id,
    hub
  );

  let parkPins = cachedParkPins;
  if (supabase) {
    const freshPins = await fetchRecentParkPins(supabase, hub, 200);
    if (freshPins.length > 0 || (ownerHubPin && pinHasGalleryMedia(ownerHubPin))) {
      parkPins = freshPins;
    }
  }

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
    travelerMemories: t("travelerMemories", { park: hub.name }),
    viewTravelMap: t("viewTravelMap"),
    viewPin: t("viewPin"),
    close: t("closePin"),
    instagramPost: t("instagramPost"),
    editYourPin: t("editYourPin"),
    editYourPinSaved: t("editYourPinSaved"),
    recentTravelers: t("recentTravelers", { park: hub.name }),
    noTravelersYet: t("noTravelersYet", { park: hub.name }),
    wantTravelers: t("wantTravelers", { park: hub.name }),
    noWantTravelersYet: t("noWantTravelersYet"),
    pinPark: t("pinPark", { park: hub.name }),
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
      <ParkPageContent
        hub={hub}
        travelers={travelers}
        wishlistTravelers={wishlistTravelers}
        memoryPins={memoryPins}
        visitorState={visitorState}
        ownerPark={ownerPark}
        visitedCountries={visitedCountries}
        loginHref={loginHref}
        registerHref={registerHref}
        pinCountItems={pinCountItems}
        labels={labels}
      />
    </main>
  );
}
