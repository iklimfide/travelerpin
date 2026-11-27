import { NextResponse } from "next/server";
import { isSafeR2ObjectKey, publicR2ObjectUrl } from "@/lib/storage/r2-public";

export const runtime = "edge";

const REDIRECT_CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

function redirectToPublicObject(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  if (!key || !isSafeR2ObjectKey(key)) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const destination = publicR2ObjectUrl(key, url.searchParams.get("v"));
  if (!destination) {
    return NextResponse.json({ error: "Photo storage is not configured" }, { status: 503 });
  }

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", REDIRECT_CACHE_CONTROL);
  return response;
}

/** Legacy `/api/hub-photo?key=` links → public R2 CDN. No object streaming. */
export function GET(request: Request) {
  return redirectToPublicObject(request);
}

export function HEAD(request: Request) {
  return redirectToPublicObject(request);
}
