import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/constants";
import { optimizeCover } from "@/lib/utils/image";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";

const COVER_BUCKET = "covers";
const COVER_PATH = (userId: string) => `${userId}/cover.webp`;

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

  if (file.size > LIMITS.coverMaxBytes) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeCover(buffer);
  const fileName = COVER_PATH(user.id);

  const { error: uploadError } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(fileName, optimized, {
      contentType: "image/webp",
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

  return NextResponse.json({ url: coverUrl, profile });
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

  await supabase.storage.from(COVER_BUCKET).remove([COVER_PATH(user.id)]);

  const { profile, error } = await updateProfileSettings(supabase, user.id, {
    cover_url: null,
  });

  if (error || !profile) {
    return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json(profile);
}
