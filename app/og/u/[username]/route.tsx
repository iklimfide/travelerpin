import { buildProfileOgImage } from "@/lib/seo/profile-og-image";
import { getOgAssetOriginFromRequest } from "@/lib/seo/og-asset-origin";

export const runtime = "edge";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { username } = await context.params;
  const response = await buildProfileOgImage(username, getOgAssetOriginFromRequest(request));
  const isVersioned = new URL(request.url).searchParams.has("v");
  response.headers.set(
    "Cache-Control",
    isVersioned
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600, stale-while-revalidate=86400"
  );
  return response;
}
