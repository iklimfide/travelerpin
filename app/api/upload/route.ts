import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isR2Configured, uploadPhotoToR2 } from "@/lib/storage/r2";
import { optimizeImage, getWebpFileName } from "@/lib/utils/image";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";

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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImage(buffer);
    const fileName = `${user.id}/${getWebpFileName(file.name)}`;
    const publicUrl = await uploadPhotoToR2(fileName, optimized, "image/webp");

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: formatPhotoUploadError(message) },
      { status: 500 }
    );
  }
}
