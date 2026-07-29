import { NextResponse } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireAdminClient, requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import {
  extractInstagramZipToTemp,
  removeTempDir,
  tempDirParent,
} from "@/lib/kamikaze/instagram-export/extract-zip";
import {
  applyInstagramImportReview,
  runInstagramImport,
} from "@/lib/kamikaze/instagram-export/run-import";
import type { InstagramImportReviewDecision } from "@/lib/kamikaze/instagram-export/review-session";
import {
  normalizeYpInstagramImportUsername,
  YP_INSTAGRAM_IMPORT_DEFAULT_USERNAME,
  YP_INSTAGRAM_IMPORT_USERNAMES,
} from "@/lib/kamikaze/instagram-import-targets";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ZIP_BYTES = 512 * 1024 * 1024;

function parseReviewDecisions(raw: string): InstagramImportReviewDecision[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("decisions must be an array");
  return parsed.map((row) => {
    if (!row || typeof row !== "object") throw new Error("Invalid decision row");
    const d = row as Record<string, unknown>;
    return {
      id: String(d.id ?? ""),
      approved: Boolean(d.approved),
      city_name: String(d.city_name ?? ""),
      country_code: String(d.country_code ?? ""),
      country_name: d.country_name != null ? String(d.country_name) : undefined,
    };
  });
}

export async function GET() {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  return NextResponse.json({
    targets: YP_INSTAGRAM_IMPORT_USERNAMES.map((username) => ({
      username,
      default: username === YP_INSTAGRAM_IMPORT_DEFAULT_USERNAME,
    })),
  });
}

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("POST /api/kamikaze/instagram-import: formData parse failed", error);
    const detail = error instanceof Error ? error.message : "";
    const tooLarge =
      /body|size|limit|length|overflow|413|payload/i.test(detail) ||
      detail.includes("10MB");
    return NextResponse.json(
      {
        error: tooLarge
          ? "ZIP çok büyük veya proxy gövde limiti aşıldı (next.config proxyClientMaxBodySize). Küçük export dene veya dev sunucusunu yeniden başlat."
          : "Form verisi okunamadı — geçerli bir .zip seçtiğinden emin ol.",
      },
      { status: tooLarge ? 413 : 400 }
    );
  }

  const file = formData.get("file");
  const modeRaw = String(formData.get("mode") ?? "preview").trim().toLowerCase();
  const apply = modeRaw === "apply" || modeRaw === "confirm";
  const applyReview = modeRaw === "apply_review";
  const targetUsername =
    normalizeYpInstagramImportUsername(String(formData.get("targetUsername") ?? "")) ??
    YP_INSTAGRAM_IMPORT_DEFAULT_USERNAME;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, username")
    .eq("username", targetUsername)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile?.id) {
    return NextResponse.json({ error: `Profile @${targetUsername} not found` }, { status: 404 });
  }

  if (applyReview) {
    const sessionId = String(formData.get("sessionId") ?? "").trim();
    const decisionsRaw = String(formData.get("decisions") ?? "").trim();
    if (!sessionId || !decisionsRaw) {
      return NextResponse.json({ error: "sessionId and decisions required" }, { status: 400 });
    }
    try {
      const decisions = parseReviewDecisions(decisionsRaw);
      const result = await applyInstagramImportReview({
        sessionId,
        decisions,
        supabase: admin,
        targetUserId: profile.id,
        targetUsername: profile.username,
      });
      return NextResponse.json({
        targetUsername: profile.username,
        apply: true,
        applyReview: true,
        ...result,
      });
    } catch (err) {
      console.error("POST /api/kamikaze/instagram-import apply_review failed", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Apply failed" },
        { status: 500 }
      );
    }
  }

  const limitRaw = String(formData.get("limit") ?? "").trim();
  const limit = limitRaw ? Math.max(1, Number(limitRaw) || 0) : undefined;

  if (!(file instanceof Blob) || file.size <= 0) {
    return NextResponse.json({ error: "ZIP file required" }, { status: 400 });
  }
  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { error: `ZIP too large (max ${Math.round(MAX_ZIP_BYTES / (1024 * 1024))} MB)` },
      { status: 413 }
    );
  }

  const tempZip = path.join(os.tmpdir(), `tp-ig-import-${Date.now()}.zip`);
  let exportRoot = "";
  let tempParent = "";
  let keepTemp = false;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempZip, buffer);
    exportRoot = await extractInstagramZipToTemp(tempZip);
    tempParent = tempDirParent(exportRoot);

    const hashtagMapJson = String(formData.get("hashtagMapJson") ?? "").trim();
    const geocodeHashtagsRaw = String(formData.get("geocodeHashtags") ?? "true").trim().toLowerCase();
    const geocodeHashtags = geocodeHashtagsRaw !== "false" && geocodeHashtagsRaw !== "0";
    const geocodeGpsRaw = String(formData.get("geocodeGps") ?? "true").trim().toLowerCase();
    const geocodeGps = geocodeGpsRaw !== "false" && geocodeGpsRaw !== "0";
    const ignoreLocationLabelsRaw = String(formData.get("ignoreLocationLabels") ?? "").trim();

    const previewMode = !apply;
    if (previewMode) keepTemp = true;

    const result = await runInstagramImport({
      exportRoot,
      limit,
      apply,
      persistReviewSession: previewMode,
      tempParent,
      hashtagMapJson,
      ignoreLocationLabelsRaw: ignoreLocationLabelsRaw || undefined,
      geocodeHashtags,
      geocodeGps,
      supabase: admin,
      targetUserId: profile.id,
      targetUsername: profile.username,
    });

    return NextResponse.json({
      targetUsername: profile.username,
      apply,
      ...result,
    });
  } catch (err) {
    keepTemp = false;
    console.error("POST /api/kamikaze/instagram-import failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  } finally {
    try {
      fs.unlinkSync(tempZip);
    } catch {
      // ignore
    }
    if (tempParent && !keepTemp) removeTempDir(tempParent);
  }
}
