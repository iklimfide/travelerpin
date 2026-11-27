import { NextResponse } from "next/server";
import { isSafeR2ObjectKey, publicR2ObjectUrl } from "@/lib/storage/r2-public";

export const runtime = "edge";

const IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, s-maxage=31536000, immutable";

export function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  if (!key || !isSafeR2ObjectKey(key)) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const cacheBuster = url.searchParams.get("v")?.trim() || null;
  const destination = publicR2ObjectUrl(key, cacheBuster);
  if (!destination) {
    return NextResponse.json({ error: "Photo storage is not configured" }, { status: 503 });
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: destination,
      "Cache-Control": IMAGE_CACHE_CONTROL,
    },
  });
}
