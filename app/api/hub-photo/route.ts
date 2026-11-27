import { NextResponse } from "next/server";
import { getR2ObjectStream, isR2Configured } from "@/lib/storage/r2";
import { isSafeR2ObjectKey } from "@/lib/storage/r2-public";

export const runtime = "nodejs";

const IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  if (!key || !isSafeR2ObjectKey(key)) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Photo storage is not configured" }, { status: 503 });
  }

  const object = await getR2ObjectStream(key);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": object.contentType,
    "Cache-Control": IMAGE_CACHE_CONTROL,
  });
  if (object.contentLength != null) {
    headers.set("Content-Length", String(object.contentLength));
  }

  return new NextResponse(object.body, { headers });
}
