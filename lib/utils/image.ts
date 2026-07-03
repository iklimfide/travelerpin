import { LIMITS } from "@/lib/constants";

type SharpModule = typeof import("sharp").default;

async function loadSharp(): Promise<SharpModule> {
  return (await import("sharp")).default;
}

export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  const sharp = await loadSharp();
  return sharp(buffer)
    .rotate()
    .resize({
      width: LIMITS.imageMaxWidth,
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function optimizeAvatar(buffer: Buffer): Promise<Buffer> {
  const sharp = await loadSharp();
  return sharp(buffer)
    .rotate()
    .resize(LIMITS.avatarSize, LIMITS.avatarSize, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 85 })
    .toBuffer();
}

export async function optimizeCover(buffer: Buffer): Promise<Buffer> {
  const sharp = await loadSharp();
  return sharp(buffer)
    .rotate()
    .resize(LIMITS.coverWidth, LIMITS.coverHeight, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 82 })
    .toBuffer();
}

export function getWebpFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
  return `${safe}-${Date.now()}.webp`;
}
