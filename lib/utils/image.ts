import "server-only";
import { createRequire } from "node:module";
import { join } from "node:path";
import { LIMITS } from "@/lib/constants";
import { UNSUPPORTED_IMAGE_FORMAT_ERROR } from "@/lib/utils/image-errors";

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
    () => createRequire(join(process.cwd(), "package.json"))("sharp") as unknown,
    () => createRequire(join(sharpRoot, "package.json"))("./dist/index.cjs") as unknown,
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

function isUnsupportedBrowserImageType(contentType: string): boolean {
  return /heif|heic|heics/i.test(contentType);
}

/** Magic-byte MIME sniffing — browsers often mislabel uploads (especially on mobile). */
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer.toString("ascii", 1, 4) === "PNG"
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return "image/gif";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return "image/heif";
    }
    if (brand.startsWith("avif")) return "image/avif";
  }
  return null;
}

function sniffImageContentType(buffer: Buffer): string | null {
  return detectImageMimeFromBuffer(buffer);
}

function assertBrowserSafeImageBuffer(buffer: Buffer, declaredType: string): void {
  const sniffed = sniffImageContentType(buffer);
  const effective = sniffed ?? declaredType;
  if (isUnsupportedBrowserImageType(effective)) {
    throw new Error(UNSUPPORTED_IMAGE_FORMAT_ERROR);
  }
}

function resolveDeclaredContentType(buffer: Buffer, declaredType: string): string {
  const detected = detectImageMimeFromBuffer(buffer);
  if (detected) return detected;
  if (declaredType.startsWith("image/")) return declaredType;
  return "image/jpeg";
}

function fallbackImage(buffer: Buffer, contentType: string): OptimizedImage {
  const type = resolveDeclaredContentType(buffer, contentType);
  assertBrowserSafeImageBuffer(buffer, type);
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
    if (error instanceof Error && error.message === UNSUPPORTED_IMAGE_FORMAT_ERROR) {
      throw error;
    }
    try {
      assertBrowserSafeImageBuffer(buffer, fallbackContentType);
    } catch (assertError) {
      if (assertError instanceof Error) throw assertError;
    }
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
    try {
      assertBrowserSafeImageBuffer(buffer, fallbackContentType);
    } catch (assertError) {
      if (assertError instanceof Error) throw assertError;
    }
    console.error("optimizeAvatar: sharp failed", error);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Image could not be converted to WebP: ${detail}`);
  }
}

export function heroStorageExtension(ext: OptimizedImage["extension"]): string {
  return ext === "jpeg" ? "jpg" : ext;
}

export function getWebpFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
  return `${safe}-${Date.now()}.webp`;
}
