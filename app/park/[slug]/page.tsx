import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ParkPageContent } from "@/components/park/ParkPageContent";
import { getParkHubBySlug, listParkHubSlugs } from "@/lib/data/park-hubs";
import { buildParkPageTitle, DEFAULT_DESCRIPTION, getSiteUrl, parkPath, parkUrl } from "@/lib/seo/site";
import { getDefaultParkHeroAlt, getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import { getCachedRecentParkPins, getCachedRecentParkTravelers } from "@/lib/supabase/park-travelers-cache";
import { fetchRecentParkPins } from "@/lib/supabase/park-travelers";
import { mergeOwnerHubPin, pinsWithContent, countHubMediaItems, pinHasGalleryMedia } from "@/lib/supabase/hub-traveler-pin";
import { countCountryWishlisters } from "@/lib/supabase/country-pin-count";
import { countParkPinners, loadParkPageUserState } from "@/lib/supabase/park-visitor-state";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { sanitizeParkSlug } from "@/lib/utils/park-slug";
import "../../city/city-page.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  return listParkHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = sanitizeParkSlug(rawSlug);
  if (!slug) return { title: "Park" };

  const hub = getParkHubBySlug(slug);
  if (!hub) return { title: "Park not found" };

  const title = buildParkPageTitle(hub.name);
  const ogImage = `${getSiteUrl()}${getDefaultParkHeroImage(hub.parkType)}`;

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: parkPath(slug) },
    openGraph: {
      title,
      description: DEFAULT_DESCRIPTION,
      url: parkUrl(slug),
      images: [{ url: ogImage, alt: getDefaultParkHeroAlt(hub.parkType) }],
    },
  };
}

export default async function ParkHubPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeParkSlug(rawSlug);
  if (!slug) notFound();

  const hub = getParkHubBySlug(slug);
  if (!hub) notFound();

  const returnPath = parkPath(slug);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;

  const [t, tCommon, cachedParkPins, travelers, user, supabase] = await Promise.all([
    getTranslations("parkHub"),
    getTranslations("common"),
    getCachedRecentParkPins(hub),
    getCachedRecentParkTravelers(hub),
    getAuthUser(),
    createClient(),
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

  const hubPins = mergeOwnerHubPin(parkPins, ownerHubPin);
  const memoryPins = pinsWithContent(hubPins);
  const mediaCounts = countHubMediaItems(hubPins);
  const pinCount = await countParkPinners(supabase, hub);
  const wishlistCount = await countCountryWishlisters(supabase, hub.countryCode);
  const pinCountItems: { label: string; href?: string }[] =
    pinCount > 0
      ? [
          {
            label: t("travelersPinned", { count: pinCount }),
            href: "#park-travelers-heading",
          },
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
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
          { label: t("travelersWantToVisit", { count: wishlistCount }) },
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
