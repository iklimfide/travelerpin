import { buildProfileOgImage } from "@/lib/seo/profile-og-image";
import { fetchProfileOgSnapshot } from "@/lib/seo/profile-og-snapshot";
import { getOgAssetOriginFromRequest } from "@/lib/seo/og-asset-origin";

export const runtime = "edge";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { username } = await context.params;
  const isVersioned = new URL(request.url).searchParams.has("v");
  const cacheControl = isVersioned
    ? "public, max-age=31536000, immutable"
    : "public, max-age=3600, stale-while-revalidate=86400";

  const snapshot = await fetchProfileOgSnapshot(username);
  if (snapshot) {
    return new Response(snapshot.body, {
      headers: {
        "Content-Type": snapshot.contentType,
        "Cache-Control": cacheControl,
      },
    });
  }

  const response = await buildProfileOgImage(username, getOgAssetOriginFromRequest(request));
  response.headers.set("Cache-Control", cacheControl);
  return response;
}
