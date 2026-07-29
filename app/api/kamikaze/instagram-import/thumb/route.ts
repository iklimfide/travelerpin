import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import { loadInstagramImportSession } from "@/lib/kamikaze/instagram-export/review-session";

export const runtime = "nodejs";

const EXT_TO_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
  const itemId = url.searchParams.get("itemId")?.trim() ?? "";

  if (!sessionId || !itemId) {
    return NextResponse.json({ error: "sessionId and itemId required" }, { status: 400 });
  }

  const session = loadInstagramImportSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
  }

  const item = session.items.find((row) => row.id === itemId);
  if (!item?.absPath || !item.hasFile || !fs.existsSync(item.absPath)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const ext = path.extname(item.absPath.split("?")[0]).toLowerCase();
  const contentType = EXT_TO_TYPE[ext] ?? "application/octet-stream";
  const buffer = fs.readFileSync(item.absPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
