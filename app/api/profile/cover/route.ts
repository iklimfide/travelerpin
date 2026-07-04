import { NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/constants";
import {
  deleteR2Objects,
  isR2Configured,
  parseR2ObjectKey,
  uploadPhotoToR2,
} from "@/lib/storage/r2";
import { optimizeCover } from "@/lib/utils/image";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";

const COVER_KEY = (userId: string, extension: string) =>
  `covers/${userId}/cover.${extension === "jpeg" ? "jpg" : extension}`;

const COVER_KEY_VARIANTS = (userId: string) => [
  COVER_KEY(userId, "webp"),
  COVER_KEY(userId, "jpg"),
  COVER_KEY(userId, "png"),
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: formatPhotoUploadError("R2 not configured") },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > LIMITS.coverMaxBytes) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeCover(buffer, file.type);
    const key = COVER_KEY(user.id, optimized.extension);

    await deleteR2Objects(COVER_KEY_VARIANTS(user.id));

    const publicUrl = await uploadPhotoToR2(key, optimized.buffer, optimized.contentType);
    const coverUrl = `${publicUrl}?v=${Date.now()}`;

    const { profile, error } = await updateProfileSettings(supabase, user.id, {
      cover_url: coverUrl,
    });

    if (error || !profile) {
      return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
    }

    await revalidateProfileForPin(supabase, user.id);

    return NextResponse.json({ url: coverUrl, profile });
  } catch (error) {
    console.error("POST /api/profile/cover failed", error);
    return NextResponse.json(
      {
        error: formatPhotoUploadError(
          error instanceof Error ? error.message : "Could not upload cover photo"
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: current } = await supabase
      .from("profiles")
      .select("cover_url")
      .eq("id", user.id)
      .maybeSingle();

    const keys = COVER_KEY_VARIANTS(user.id);
    const currentKey = current?.cover_url ? parseR2ObjectKey(current.cover_url) : null;
    if (currentKey) keys.push(currentKey);

    if (isR2Configured()) {
      await deleteR2Objects(keys);
    }

    const { profile, error } = await updateProfileSettings(supabase, user.id, {
      cover_url: null,
    });

    if (error || !profile) {
      return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
    }

    await revalidateProfileForPin(supabase, user.id);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("DELETE /api/profile/cover failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove cover photo" },
      { status: 500 }
    );
  }
}
