import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isR2Configured, uploadPhotoToR2 } from "@/lib/storage/r2";
import { detectImageMimeFromBuffer, getWebpFileName, optimizeImageToWebp } from "@/lib/utils/image";
import { UNSUPPORTED_IMAGE_FORMAT_ERROR } from "@/lib/utils/image-errors";
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      detectImageMimeFromBuffer(buffer) ??
      (file.type.startsWith("image/") ? file.type : "");

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: formatPhotoUploadError(UNSUPPORTED_IMAGE_FORMAT_ERROR) },
        { status: 400 }
      );
    }

    const optimized = await optimizeImageToWebp(buffer, contentType);
    const fileName = `${user.id}/${getWebpFileName(file.name)}`;
    const publicUrl = await uploadPhotoToR2(
      fileName,
      optimized.buffer,
      optimized.contentType
    );

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: formatPhotoUploadError(message) },
      { status: 500 }
    );
  }
}
