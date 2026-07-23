import "server-only";
import { LIMITS } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site";
import {
  getR2Object,
  isR2PublicMediaUrl,
  isSafeR2ObjectKey,
  parseR2ObjectKey,
} from "@/lib/storage/r2";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const BLOCKED_HOST_SUFFIXES = [".local", ".internal"];

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(lower)) return true;
  return false;
}

function parseUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(trimmed, getSiteUrl());
    } catch {
      return null;
    }
  }
}

function parseHubPhotoObjectKey(rawUrl: string): string | null {
  const parsed = parseUrl(rawUrl);
  if (!parsed || parsed.pathname !== "/api/hub-photo") return null;

  const key = parsed.searchParams.get("key")?.trim() ?? "";
  return isSafeR2ObjectKey(key) ? key : null;
}

function parseAnyR2ObjectKey(rawUrl: string): string | null {
  const fromProxy = parseR2ObjectKey(rawUrl);
  if (fromProxy) return fromProxy;

  if (!isR2PublicMediaUrl(rawUrl)) return null;

  try {
    const key = decodeURIComponent(new URL(rawUrl).pathname.replace(/^\//, ""));
    return isSafeR2ObjectKey(key) ? key : null;
  } catch {
    return null;
  }
}

const GOOGLE_PHOTOS_LINK_ERROR =
  "Google Photos linkleri oturum ister; sunucu Google hesabınıza giremez. Görseli bilgisayara indirip «Foto yükle» kullanın.";

function assertNotGooglePhotosViewerLink(parsed: URL): void {
  const host = parsed.hostname.toLowerCase();
  if (host === "photos.google.com" || host.endsWith(".photos.google.com")) {
    throw new Error(GOOGLE_PHOTOS_LINK_ERROR);
  }
  if (host.endsWith(".googleusercontent.com") && parsed.pathname.includes("/pw/")) {
    throw new Error(GOOGLE_PHOTOS_LINK_ERROR);
  }
  if (host.endsWith(".usercontent.google.com") && parsed.pathname.includes("/pw/")) {
    throw new Error(GOOGLE_PHOTOS_LINK_ERROR);
  }
}

function assertNotAuthHtmlPage(buffer: Buffer): void {
  const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8").toLowerCase();
  if (!head.includes("<html")) return;

  if (
    head.includes("accounts.google.com") ||
    (head.includes("sign in") && head.includes("google"))
  ) {
    throw new Error(GOOGLE_PHOTOS_LINK_ERROR);
  }

  throw new Error("Link bir görsele işaret etmiyor (HTML sayfası döndü)");
}

function detectImageContentType(buffer: Buffer): string | null {
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";

    const boxType = buffer.subarray(4, 8).toString("ascii");
    if (boxType === "ftyp") {
      const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
      if (brand.startsWith("avif") || brand === "avis") return "image/avif";
    }
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 6) {
    const gif = buffer.subarray(0, 6).toString("ascii");
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  return null;
}

function contentTypeFromUrlPath(pathname: string): string | null {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

function assertImageSize(byteLength: number): void {
  if (byteLength > LIMITS.avatarMaxBytes) {
    throw new Error("Görsel en fazla 5 MB olabilir");
  }
}

function normalizeImageContentType(
  buffer: Buffer,
  contentType: string,
  urlPathname = ""
): string {
  const normalized = contentType.split(";")[0].trim().toLowerCase();
  if (normalized.startsWith("text/html") || normalized.includes("html")) {
    assertNotAuthHtmlPage(buffer);
  }
  if (normalized.startsWith("image/")) return normalized;

  const detected = detectImageContentType(buffer);
  if (detected) return detected;

  const fromPath = contentTypeFromUrlPath(urlPathname);
  if (fromPath) return fromPath;

  assertNotAuthHtmlPage(buffer);
  throw new Error("Link bir görsele işaret etmiyor (doğrudan .jpg/.png/.webp/.avif URL kullanın)");
}

async function readR2ImageBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const object = await getR2Object(key);
  if (!object) {
    throw new Error("Görsel bulunamadı");
  }

  assertImageSize(object.body.byteLength);
  const buffer = Buffer.from(object.body);
  return {
    buffer,
    contentType: normalizeImageContentType(buffer, object.contentType, key),
  };
}

async function readHttpImageBuffer(parsed: URL): Promise<{ buffer: Buffer; contentType: string }> {
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Bu link kullanılamaz (localhost veya özel ağ)");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "image/*,*/*",
        "User-Agent": "TravelerPinYP/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Görsel indirilemedi (${response.status})`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > LIMITS.avatarMaxBytes) {
      throw new Error("Görsel en fazla 5 MB olabilir");
    }

    const arrayBuffer = await response.arrayBuffer();
    assertImageSize(arrayBuffer.byteLength);
    const buffer = Buffer.from(arrayBuffer);
    const headerType = response.headers.get("content-type") ?? "application/octet-stream";

    return {
      buffer,
      contentType: normalizeImageContentType(buffer, headerType, parsed.pathname),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Görsel indirme zaman aşımına uğradı");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRemoteImageBuffer(
  rawUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Görsel linki gerekli");
  }

  const hubPhotoKey = parseHubPhotoObjectKey(trimmed);
  if (hubPhotoKey) {
    return readR2ImageBuffer(hubPhotoKey);
  }

  const r2Key = parseAnyR2ObjectKey(trimmed);
  if (r2Key) {
    return readR2ImageBuffer(r2Key);
  }

  const parsed = parseUrl(trimmed);
  if (!parsed) {
    throw new Error("Geçersiz görsel linki");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Link http veya https olmalı");
  }

  if (parsed.pathname.startsWith("/park/") || parsed.pathname.startsWith("/city/")) {
    throw new Error("Sayfa linki değil, doğrudan görsel dosyası linki gerekli");
  }

  assertNotGooglePhotosViewerLink(parsed);

  return readHttpImageBuffer(parsed);
}
