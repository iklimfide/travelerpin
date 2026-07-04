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
import { optimizeAvatar } from "@/lib/utils/image";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";

const AVATAR_KEY = (userId: string, extension: string) =>
  `avatars/${userId}/avatar.${extension === "jpeg" ? "jpg" : extension}`;

const AVATAR_KEY_VARIANTS = (userId: string) => [
  AVATAR_KEY(userId, "webp"),
  AVATAR_KEY(userId, "jpg"),
  AVATAR_KEY(userId, "png"),
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

    if (file.size > LIMITS.avatarMaxBytes) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeAvatar(buffer, file.type);
    const key = AVATAR_KEY(user.id, optimized.extension);

    await deleteR2Objects(AVATAR_KEY_VARIANTS(user.id));

    const publicUrl = await uploadPhotoToR2(key, optimized.buffer, optimized.contentType);
    const avatarUrl = `${publicUrl}?v=${Date.now()}`;

    const { profile, error } = await updateProfileSettings(supabase, user.id, {
      avatar_url: avatarUrl,
    });

    if (error || !profile) {
      return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
    }

    await revalidateProfileForPin(supabase, user.id);

    return NextResponse.json({ url: avatarUrl, profile });
  } catch (error) {
    console.error("POST /api/profile/avatar failed", error);
    return NextResponse.json(
      {
        error: formatPhotoUploadError(
          error instanceof Error ? error.message : "Could not upload photo"
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
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const keys = AVATAR_KEY_VARIANTS(user.id);
    const currentKey = current?.avatar_url ? parseR2ObjectKey(current.avatar_url) : null;
    if (currentKey) keys.push(currentKey);

    if (isR2Configured()) {
      await deleteR2Objects(keys);
    }

    const { profile, error } = await updateProfileSettings(supabase, user.id, {
      avatar_url: null,
    });

    if (error || !profile) {
      return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
    }

    await revalidateProfileForPin(supabase, user.id);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("DELETE /api/profile/avatar failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove photo" },
      { status: 500 }
    );
  }
}
