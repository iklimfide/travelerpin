import { createRequire } from "node:module";
import { join } from "node:path";
import { LIMITS } from "@/lib/constants";

type SharpInstance = import("sharp").Sharp;
type SharpModule = (input: Buffer) => SharpInstance;

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  extension: "webp" | "jpg" | "png" | "jpeg";
};

/**
 * Load sharp via createRequire so Turbopack does not break the native binding.
 * Dynamic `import("sharp")` can yield `sharp.libvipsVersion is not a function`.
 */
function loadSharp(): SharpModule {
  const require = createRequire(join(process.cwd(), "package.json"));
  const mod: unknown = require("sharp");
  const candidate =
    typeof mod === "function"
      ? mod
      : mod && typeof mod === "object" && "default" in mod
        ? (mod as { default: unknown }).default
        : null;
  if (typeof candidate !== "function") {
    throw new Error("sharp module did not export a function");
  }
  const sharp = candidate as SharpModule;
  // Probe native binding early.
  void (sharp as unknown as { versions?: { vips?: string } }).versions;
  return sharp;
}

function extensionForContentType(contentType: string): OptimizedImage["extension"] {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function fallbackImage(buffer: Buffer, contentType: string): OptimizedImage {
  const type = contentType.startsWith("image/") ? contentType : "image/jpeg";
  return {
    buffer,
    contentType: type,
    extension: extensionForContentType(type),
  };
}

export async function optimizeImage(
  buffer: Buffer,
  fallbackContentType = "image/jpeg"
): Promise<OptimizedImage> {
  try {
    const sharp = loadSharp();
    const out = await sharp(buffer)
      .rotate()
      .resize({
        width: LIMITS.imageMaxWidth,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: out, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    console.error("optimizeImage: sharp failed, using original file", error);
    return fallbackImage(buffer, fallbackContentType);
  }
}

export async function optimizeAvatar(
  buffer: Buffer,
  fallbackContentType = "image/jpeg"
): Promise<OptimizedImage> {
  try {
    const sharp = loadSharp();
    const out = await sharp(buffer)
      .rotate()
      .resize(LIMITS.avatarSize, LIMITS.avatarSize, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 85 })
      .toBuffer();
    return { buffer: out, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    console.error("optimizeAvatar: sharp failed, using original file", error);
    return fallbackImage(buffer, fallbackContentType);
  }
}

export async function optimizeCover(
  buffer: Buffer,
  fallbackContentType = "image/jpeg"
): Promise<OptimizedImage> {
  try {
    const sharp = loadSharp();
    const out = await sharp(buffer)
      .rotate()
      .resize(LIMITS.coverWidth, LIMITS.coverHeight, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: out, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    console.error("optimizeCover: sharp failed, using original file", error);
    return fallbackImage(buffer, fallbackContentType);
  }
}

export function getWebpFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
  return `${safe}-${Date.now()}.webp`;
}
