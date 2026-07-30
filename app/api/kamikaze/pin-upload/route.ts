import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminClient, requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import {
  normalizeYpInstagramImportUsername,
  YP_INSTAGRAM_IMPORT_USERNAMES,
} from "@/lib/kamikaze/instagram-import-targets";
import {
  appendYpPhotosToPin,
  loadYpPinUploadSnapshot,
} from "@/lib/kamikaze/yp-pin-upload";
import { profileCacheTag } from "@/lib/cache/revalidate-profile";
import { LIMITS } from "@/lib/constants";
import { isR2Configured, uploadPhotoToR2 } from "@/lib/storage/r2";
import {
  detectImageMimeFromBuffer,
  getPinPhotoObjectKey,
  optimizeImage,
} from "@/lib/utils/image";
import { mimeFromImageFileName } from "@/lib/utils/image-mime";
import {
  PIN_PHOTO_FILE_TOO_LARGE_ERROR,
  UNSUPPORTED_IMAGE_FORMAT_ERROR,
} from "@/lib/utils/image-errors";
import { ELEVATED_PIN_PHOTO_LIMIT } from "@/lib/utils/pin-photo-limits";

export const runtime = "nodejs";
export const maxDuration = 300;

async function resolveTargetProfile(admin: SupabaseClient, username: string) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.id) throw new Error(`Profile @${username} not found`);
  return profile;
}

function revalidateAfterUpload(username: string) {
  revalidateTag(profileCacheTag(username), "max");
  if (username.toLowerCase() === "guvencgiller") {
    revalidateTag("jennifer-demo-guvenc-pins-v5", "max");
  }
}

function resolveUploadContentType(buffer: Buffer, blob: Blob, fileName: string): string {
  const sniffed = detectImageMimeFromBuffer(buffer);
  if (sniffed) return sniffed;
  const declared = "type" in blob && typeof blob.type === "string" ? blob.type.trim() : "";
  if (declared.startsWith("image/")) return declared;
  return mimeFromImageFileName(fileName) ?? "";
}

async function uploadPinPhotoForUser(
  userId: string,
  blob: Blob,
  fileName: string
): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  if (buffer.length === 0) throw new Error("Empty image file");
  if (buffer.length > LIMITS.maxPinPhotoBytes) {
    throw new Error(PIN_PHOTO_FILE_TOO_LARGE_ERROR);
  }

  const contentType = resolveUploadContentType(buffer, blob, fileName);
  if (!contentType.startsWith("image/")) {
    throw new Error(UNSUPPORTED_IMAGE_FORMAT_ERROR);
  }

  const optimized = await optimizeImage(buffer, contentType);
  const objectKey = getPinPhotoObjectKey(userId, fileName, optimized.extension);
  return uploadPhotoToR2(objectKey, optimized.buffer, optimized.contentType);
}

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  const username =
    normalizeYpInstagramImportUsername(
      new URL(request.url).searchParams.get("username") ?? ""
    ) ?? null;

  if (!username) {
    return NextResponse.json({
      targets: YP_INSTAGRAM_IMPORT_USERNAMES,
      maxPhotosPerPin: ELEVATED_PIN_PHOTO_LIMIT,
    });
  }

  try {
    const profile = await resolveTargetProfile(admin, username);
    const snapshot = await loadYpPinUploadSnapshot(admin, profile.id, profile.username);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const username = normalizeYpInstagramImportUsername(String(formData.get("username") ?? ""));
  if (!username) {
    return NextResponse.json({ error: "Invalid target username" }, { status: 400 });
  }

  const pinKind = String(formData.get("pinKind") ?? "").trim();
  if (pinKind !== "city" && pinKind !== "park") {
    return NextResponse.json({ error: "pinKind must be city or park" }, { status: 400 });
  }

  const pinId = String(formData.get("pinId") ?? "").trim();
  if (!pinId) {
    return NextResponse.json({ error: "pinId required" }, { status: 400 });
  }

  const fileEntries = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  if (fileEntries.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  try {
    const profile = await resolveTargetProfile(admin, username);
    const uploadedUrls: string[] = [];
    const uploadErrors: string[] = [];

    for (const file of fileEntries) {
      const name = file instanceof File && file.name.trim() ? file.name.trim() : "photo.jpg";
      try {
        const url = await uploadPinPhotoForUser(profile.id, file, name);
        uploadedUrls.push(url);
      } catch (err) {
        uploadErrors.push(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: uploadErrors[0] ?? "Upload failed" },
        { status: 400 }
      );
    }

    const result = await appendYpPhotosToPin(
      admin,
      profile.id,
      pinKind,
      pinId,
      uploadedUrls,
      ELEVATED_PIN_PHOTO_LIMIT
    );

    revalidateAfterUpload(profile.username);

    return NextResponse.json({
      ok: true,
      ...result,
      uploadedCount: uploadedUrls.length,
      uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
    });
  } catch (err) {
    console.error("POST /api/kamikaze/pin-upload failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
