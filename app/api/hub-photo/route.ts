import { NextResponse } from "next/server";
import { getR2Object, isR2Configured } from "@/lib/storage/r2";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Photo storage is not configured" }, { status: 503 });
  }

  const object = await getR2Object(key);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(object.body), {
    headers: {
      "Content-Type": object.contentType,
      // max-age = browsers; s-maxage = Vercel CDN so Fluid Functions are not
      // re-invoked for every visitor of the same immutable R2 object key.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
