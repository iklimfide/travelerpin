import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";
import {
  buildStaticDemoPublicProfilePage,
  DEMO_PUBLIC_PROFILE_BUNDLE,
  DEMO_PROFILE,
  getDemoVisitedCities,
  getDemoVisitedParks,
  loadJenniferDemoPageStatic,
  type JenniferDemoPageData,
} from "@/lib/data/demo-page-static";
import { getAuthUser } from "@/lib/supabase/auth";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

export {
  DEMO_PROFILE,
  DEMO_PUBLIC_PROFILE_BUNDLE,
  getDemoVisitedCities,
  getDemoVisitedParks,
  buildStaticDemoPublicProfilePage,
};

export { isDemoProfileUsername };

export async function loadDemoPublicProfilePage(
  username: string
): Promise<PublicProfilePageData | null> {
  if (!isDemoProfileUsername(username)) return null;

  const authUser = await getAuthUser();
  return buildStaticDemoPublicProfilePage({ isLoggedIn: !!authUser });
}

/** @deprecated Use loadDemoPublicProfilePage */
export function loadJenniferDemoPage(): JenniferDemoPageData {
  return loadJenniferDemoPageStatic();
}

export type { JenniferDemoPageData };
