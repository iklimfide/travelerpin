import { NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/constants";
import { optimizeCover } from "@/lib/utils/image";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";

const COVER_BUCKET = "covers";
const COVER_PATH = (userId: string, extension: string) =>
  `${userId}/cover.${extension === "jpeg" ? "jpg" : extension}`;

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
    const fileName = COVER_PATH(user.id, optimized.extension);

    // Remove previous cover variants so we don't leave stale webp/jpg side by side.
    await supabase.storage
      .from(COVER_BUCKET)
      .remove([
        COVER_PATH(user.id, "webp"),
        COVER_PATH(user.id, "jpg"),
        COVER_PATH(user.id, "png"),
      ]);

    const { error: uploadError } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(fileName, optimized.buffer, {
        contentType: optimized.contentType,
        upsert: true,
      });

    if (uploadError) {
      const message =
        uploadError.message === "Bucket not found"
          ? "Cover upload is not configured yet. Run migration 020_profile_cover.sql in Supabase."
          : uploadError.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(COVER_BUCKET).getPublicUrl(fileName);

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
      { error: error instanceof Error ? error.message : "Could not upload cover photo" },
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

    await supabase.storage.from(COVER_BUCKET).remove([
      COVER_PATH(user.id, "webp"),
      COVER_PATH(user.id, "jpg"),
      COVER_PATH(user.id, "png"),
    ]);

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
