import { ProfileNextRouteSection } from "@/components/profile/ProfileNextRouteSection";
import { parseNextRoute } from "@/lib/utils/next-route";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type HomeLandingDemoNextRouteProps = {
  data: PublicProfilePageData;
  displayName: string;
  isOwnProfile: boolean;
  sectionId?: string;
};

export function HomeLandingDemoNextRoute({
  data,
  displayName,
  isOwnProfile,
  sectionId = "profile-next-route",
}: HomeLandingDemoNextRouteProps) {
  return (
    <ProfileNextRouteSection
      sectionId={sectionId}
      initialStops={parseNextRoute(data.profile.next_route)}
      initialTotalDays={data.profile.next_route_total_days}
      initialTransport={data.profile.next_route_transport}
      isOwnProfile={isOwnProfile}
      displayName={displayName}
      username={data.profile.username}
      avatarUrl={data.profile.avatar_url}
      visitedCountries={data.visitedCountries}
      visitedCities={data.visitedCities}
    />
  );
}
