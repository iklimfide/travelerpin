import "server-only";
import { LIMITS } from "@/lib/constants";
import { fetchRemoteImageBuffer } from "@/lib/kamikaze/fetch-remote-image";

export class HeroImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeroImageInputError";
  }
}

export async function readKamikazeHeroImageInput(
  formData: FormData
): Promise<{ buffer: Buffer; contentType: string }> {
  const file = formData.get("file");
  const imageUrl = String(formData.get("imageUrl") ?? formData.get("url") ?? "").trim();

  if (file instanceof File) {
    if (!file.type.startsWith("image/")) {
      throw new HeroImageInputError("Dosya bir görsel olmalı");
    }
    if (file.size > LIMITS.avatarMaxBytes) {
      throw new HeroImageInputError("Görsel en fazla 5 MB olabilir");
    }
    return {
      buffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    };
  }

  if (imageUrl) {
    try {
      return await fetchRemoteImageBuffer(imageUrl);
    } catch (error) {
      throw new HeroImageInputError(
        error instanceof Error ? error.message : "Görsel indirilemedi"
      );
    }
  }

  throw new HeroImageInputError("Görsel dosyası veya link gerekli");
}
