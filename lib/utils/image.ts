import "server-only";
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

let cachedSharp: SharpModule | null = null;

/**
 * Load sharp from node_modules on disk so Turbopack does not substitute the wasm stub
 * (`sharp.libvipsVersion is not a function` / missing `@emnapi/runtime`).
 */
function loadSharp(): SharpModule {
  if (cachedSharp) return cachedSharp;

  const sharpRoot = join(process.cwd(), "node_modules", "sharp");
  const loaders = [
    () => createRequire(join(sharpRoot, "package.json"))("./dist/index.cjs") as unknown,
    () => createRequire(join(process.cwd(), "package.json"))("sharp") as unknown,
  ];

  for (const load of loaders) {
    try {
      const mod = load();
      const sharp =
        typeof mod === "function"
          ? mod
          : mod && typeof mod === "object" && "default" in mod
            ? (mod as { default: unknown }).default
            : null;
      if (typeof sharp !== "function") continue;

      const probe = sharp as SharpModule & { versions?: { sharp?: string } };
      if (!probe.versions?.sharp) continue;

      cachedSharp = sharp as SharpModule;
      return cachedSharp;
    } catch {
      // try next loader
    }
  }

  throw new Error("sharp native module is unavailable");
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

async function encodeWebp(buffer: Buffer): Promise<OptimizedImage> {
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
}

export async function optimizeImage(
  buffer: Buffer,
  fallbackContentType = "image/jpeg"
): Promise<OptimizedImage> {
  try {
    return await encodeWebp(buffer);
  } catch (error) {
    console.error("optimizeImage: sharp failed, using original file", error);
    return fallbackImage(buffer, fallbackContentType);
  }
}

/** Same pipeline as optimizeImage but fails instead of keeping the original format. */
export async function optimizeImageToWebp(
  buffer: Buffer,
  fallbackContentType = "image/jpeg"
): Promise<OptimizedImage> {
  try {
    return await encodeWebp(buffer);
  } catch (error) {
    console.error("optimizeImageToWebp: sharp failed", error);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Image could not be converted to WebP: ${detail}`);
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

export function getWebpFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
  return `${safe}-${Date.now()}.webp`;
}
