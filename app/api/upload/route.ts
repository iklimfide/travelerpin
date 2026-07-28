import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isR2Configured, uploadPhotoToR2 } from "@/lib/storage/r2";
import { LIMITS } from "@/lib/constants";
import {
  getPinPhotoObjectKey,
  detectImageMimeFromBuffer,
  optimizeImage,
} from "@/lib/utils/image";
import { mimeFromImageFileName } from "@/lib/utils/image-mime";
import {
  PIN_PHOTO_FILE_TOO_LARGE_ERROR,
  UNSUPPORTED_IMAGE_FORMAT_ERROR,
} from "@/lib/utils/image-errors";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";

function readUploadBlob(formData: FormData): Blob | null {
  const entry = formData.get("file");
  if (!entry) return null;
  if (entry instanceof Blob) return entry;
  return null;
}

function resolveUploadContentType(buffer: Buffer, blob: Blob, fileName: string): string {
  const sniffed = detectImageMimeFromBuffer(buffer);
  if (sniffed) return sniffed;

  const declared = "type" in blob && typeof blob.type === "string" ? blob.type.trim() : "";
  if (declared.startsWith("image/")) return declared;

  return mimeFromImageFileName(fileName) ?? "";
}

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("POST /api/upload: formData parse failed", error);
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const blob = readUploadBlob(formData);
  if (!blob) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const uploadName =
    blob instanceof File && blob.name.trim() ? blob.name.trim() : "photo.jpg";

  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: formatPhotoUploadError("Empty image file") },
        { status: 400 }
      );
    }

    if (buffer.length > LIMITS.maxPinPhotoBytes) {
      return NextResponse.json(
        { error: formatPhotoUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR) },
        { status: 400 }
      );
    }

    const contentType = resolveUploadContentType(buffer, blob, uploadName);
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: formatPhotoUploadError(UNSUPPORTED_IMAGE_FORMAT_ERROR) },
        { status: 400 }
      );
    }

    const optimized = await optimizeImage(buffer, contentType);
    const objectKey = getPinPhotoObjectKey(user.id, uploadName, optimized.extension);
    const publicUrl = await uploadPhotoToR2(objectKey, optimized.buffer, optimized.contentType);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("POST /api/upload failed", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: formatPhotoUploadError(message) },
      { status: 500 }
    );
  }
}
