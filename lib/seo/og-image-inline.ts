const SUPABASE_HOST = /\.supabase\.co$/;

type SharpModule = typeof import("sharp").default;

async function loadSharp(): Promise<SharpModule> {
  return (await import("sharp")).default;
}

export function isAllowedOgImageUrl(url: string, siteUrl?: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (SUPABASE_HOST.test(parsed.hostname)) return parsed.protocol === "https:";
    if (!siteUrl) return false;
    return parsed.hostname === new URL(siteUrl).hostname;
  } catch {
    return false;
  }
}

type InlineImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
};

async function fetchAndConvertToPng(
  url: string,
  options?: InlineImageOptions
): Promise<Buffer | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const input = Buffer.from(await response.arrayBuffer());
  if (input.length === 0) return null;

  const sharp = await loadSharp();
  let pipeline = sharp(input).rotate();
  if (options?.maxWidth || options?.maxHeight) {
    pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
      fit: "cover",
      withoutEnlargement: true,
    });
  }

  return pipeline.toColourspace("srgb").png({ compressionLevel: 6 }).toBuffer();
}

/** Inline remote image as PNG data URL for next/og (Satori cannot load WebP or self-fetch). */
export async function loadOgImageDataUrl(
  url: string | null,
  siteUrl?: string,
  options?: InlineImageOptions
): Promise<string | null> {
  if (!url || !isAllowedOgImageUrl(url, siteUrl)) return null;

  try {
    const png = await fetchAndConvertToPng(url, options);
    if (!png) return null;
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function loadOgImagePng(
  url: string,
  options?: InlineImageOptions
): Promise<Buffer | null> {
  try {
    return await fetchAndConvertToPng(url, options);
  } catch {
    return null;
  }
}
