import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminClient, requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import {
  dedupeYpProfilePhotosByBytes,
  dedupeYpProfilePhotosByExactUrl,
  clearAllYpHostedPhotos,
  loadYpProfileMediaSnapshot,
  moveYpProfilePhoto,
  removeYpProfilePhoto,
} from "@/lib/kamikaze/profile-media-fix";
import {
  normalizeYpInstagramImportUsername,
  YP_INSTAGRAM_IMPORT_USERNAMES,
} from "@/lib/kamikaze/instagram-import-targets";
import { profileCacheTag } from "@/lib/cache/revalidate-profile";

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

function revalidateAfterFix(username: string) {
  revalidateTag(profileCacheTag(username), "max");
  if (username.toLowerCase() === "guvencgiller") {
    revalidateTag("jennifer-demo-guvenc-pins-v4", "max");
  }
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
    });
  }

  try {
    const profile = await resolveTargetProfile(admin, username);
    const snapshot = await loadYpProfileMediaSnapshot(admin, profile.id, profile.username);
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = normalizeYpInstagramImportUsername(String(body.username ?? ""));
  if (!username) {
    return NextResponse.json({ error: "Invalid target username" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  try {
    const profile = await resolveTargetProfile(admin, username);

    if (action === "dedupe_urls") {
      const result = await dedupeYpProfilePhotosByExactUrl(admin, profile.id);
      revalidateAfterFix(profile.username);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "dedupe_bytes") {
      const result = await dedupeYpProfilePhotosByBytes(admin, profile.id);
      revalidateAfterFix(profile.username);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "remove_photo") {
      const cityId = String(body.cityId ?? "");
      const photoUrl = String(body.photoUrl ?? "");
      if (!cityId || !photoUrl) {
        return NextResponse.json({ error: "cityId and photoUrl required" }, { status: 400 });
      }
      const result = await removeYpProfilePhoto(admin, profile.id, cityId, photoUrl);
      revalidateAfterFix(profile.username);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "move_photo") {
      const fromCityId = String(body.fromCityId ?? "");
      const toCityId = String(body.toCityId ?? "");
      const photoUrl = String(body.photoUrl ?? "");
      if (!fromCityId || !toCityId || !photoUrl) {
        return NextResponse.json({ error: "fromCityId, toCityId, photoUrl required" }, { status: 400 });
      }
      const result = await moveYpProfilePhoto(admin, profile.id, fromCityId, toCityId, photoUrl);
      revalidateAfterFix(profile.username);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "clear_all_hosted_photos") {
      const result = await clearAllYpHostedPhotos(admin, profile.id);
      revalidateAfterFix(profile.username);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/kamikaze/profile-media failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}
