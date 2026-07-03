import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/constants";
import { optimizeAvatar } from "@/lib/utils/image";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";

const AVATAR_BUCKET = "avatars";
const AVATAR_PATH = (userId: string) => `${userId}/avatar.webp`;

export async function POST(request: Request) {
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

  if (file.size > LIMITS.avatarMaxBytes) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeAvatar(buffer);
  const fileName = AVATAR_PATH(user.id);

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, optimized, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    const message =
      uploadError.message === "Bucket not found"
        ? "Photo upload is not configured yet. Run migration 005_avatars_storage.sql in Supabase."
        : uploadError.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { profile, error } = await updateProfileSettings(supabase, user.id, {
    avatar_url: avatarUrl,
  });

  if (error || !profile) {
    return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ url: avatarUrl, profile });
}

export async function DELETE() {
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

  await supabase.storage.from(AVATAR_BUCKET).remove([AVATAR_PATH(user.id)]);

  const { profile, error } = await updateProfileSettings(supabase, user.id, {
    avatar_url: null,
  });

  if (error || !profile) {
    return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json(profile);
}
