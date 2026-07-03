import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CountryPageContent } from "@/components/country/CountryPageContent";
import { getCountryHubBySlug, listCountryHubSlugs } from "@/lib/data/country-hubs";
import { getCachedRecentCountryTravelers } from "@/lib/supabase/country-travelers-cache";
import { getCachedRecentCountryPins } from "@/lib/supabase/country-memory-pins-cache";
import { fetchRecentCountryPins } from "@/lib/supabase/country-memory-pins";
import {
  countHubMediaItems,
  mergeOwnerHubPin,
  pinHasGalleryMedia,
  pinsWithContent,
} from "@/lib/supabase/hub-traveler-pin";
import { countCountryPinners, countCountryWishlisters } from "@/lib/supabase/country-pin-count";
import { loadCountryPageUserState } from "@/lib/supabase/country-visitor-state";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { countryPath, countryUrl, buildCountryPageTitle, DEFAULT_DESCRIPTION } from "@/lib/seo/site";
import { sanitizeCountrySlug } from "@/lib/utils/sanitize-country-slug";
import "../../city/city-page.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  return listCountryHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = sanitizeCountrySlug(rawSlug);
  if (!slug) return { title: "Country" };

  const hub = getCountryHubBySlug(slug);
  if (!hub) return { title: "Country not found" };

  const title = buildCountryPageTitle(hub.name);

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: countryPath(slug) },
    openGraph: {
      title,
      description: DEFAULT_DESCRIPTION,
      url: countryUrl(slug),
    },
  };
}

export default async function CountryHubPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeCountrySlug(rawSlug);
  if (!slug) notFound();

  const hub = getCountryHubBySlug(slug);
  if (!hub) notFound();

  const returnPath = countryPath(slug);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;

  const [t, tCommon, travelers, cachedCountryPins, user, supabase] = await Promise.all([
    getTranslations("countryHub"),
    getTranslations("common"),
    getCachedRecentCountryTravelers(hub.code),
    getCachedRecentCountryPins(hub.code),
    getAuthUser(),
    createClient(),
  ]);

  const { visitorState, editOwnerCity, editOwnerPark, ownerHubPin, visitedCountries } =
    await loadCountryPageUserState(supabase, user?.id, hub);

  let countryPins = cachedCountryPins;
  if (supabase) {
    const freshPins = await fetchRecentCountryPins(supabase, hub.code, 200);
    if (freshPins.length > 0 || (ownerHubPin && pinHasGalleryMedia(ownerHubPin))) {
      countryPins = freshPins;
    }
  }

  const hubPins = mergeOwnerHubPin(countryPins, ownerHubPin);
  const memoryPins = pinsWithContent(hubPins);
  const mediaCounts = countHubMediaItems(hubPins);
  const pinCount = await countCountryPinners(supabase, hub.code);
  const wishlistCount = await countCountryWishlisters(supabase, hub.code);
  const pinCountItems: { label: string; href?: string }[] =
    pinCount > 0
      ? [
          {
            label: t("travelersPinned", { count: pinCount }),
            href: "#country-travelers-heading",
          },
          {
            label: t("travelersWantToVisit", { count: wishlistCount }),
          },
          {
            label: t("photosAdded", { count: mediaCounts.photos }),
            href: "#country-photos-heading",
          },
          {
            label: t("instagramPostsAdded", { count: mediaCounts.instagramPosts }),
            href: "#country-instagram-heading",
          },
        ]
      : [
          { label: t("noTravelersPinned") },
          { label: t("travelersWantToVisit", { count: wishlistCount }) },
        ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${hub.name} on TravelerPin`,
    description: hub.visaNote,
    url: countryUrl(slug),
  };

  const labels = {
    home: t("home"),
    visited: t("visited"),
    wantToVisit: t("wantToVisit"),
    like: t("like"),
    countryAdded: t("countryAdded"),
    countryRemoved: t("countryRemoved"),
    wishlistAdded: t("wishlistAdded"),
    wishlistRemoved: t("wishlistRemoved"),
    removePlacesFirst: t("removePlacesFirst"),
    capital: t("capital"),
    currency: t("currency"),
    plugType: t("plugType"),
    visa: t("visa"),
    language: t("language"),
    viewTravelMap: t("viewTravelMap"),
    viewPin: t("viewPin"),
    close: t("closePin"),
    instagramPost: t("instagramPost"),
    editYourPin: t("editYourPin"),
    editYourPinSaved: t("editYourPinSaved"),
    recentTravelers: t("recentTravelers", { country: hub.name }),
    noTravelersYet: t("noTravelersYet", { country: hub.name }),
    pinCountry: t("pinCountry"),
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <CountryPageContent
          hub={hub}
          travelers={travelers}
          memoryPins={memoryPins}
          visitorState={visitorState}
          editOwnerCity={editOwnerCity}
          editOwnerPark={editOwnerPark}
          visitedCountries={visitedCountries}
          loginHref={loginHref}
          registerHref={registerHref}
          pinCountItems={pinCountItems}
          labels={labels}
        />
      </main>
    </>
  );
}
