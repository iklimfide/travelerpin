import {
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/** Server + client (via NEXT_PUBLIC_) base URL for stored R2 media links. */
export function getR2PublicBaseUrl(): string | undefined {
  return readEnv("R2_PUBLIC_BASE_URL") ?? readEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL");
}

export function isR2Configured(): boolean {
  return Boolean(
    readEnv("R2_ACCOUNT_ID") &&
      readEnv("R2_ACCESS_KEY_ID") &&
      readEnv("R2_SECRET_ACCESS_KEY") &&
      readEnv("R2_BUCKET_NAME") &&
      getR2PublicBaseUrl()
  );
}

function getR2Endpoint(): string {
  const endpoint = readEnv("R2_ENDPOINT");
  if (endpoint) return endpoint.replace(/\/$/, "");

  const accountId = readEnv("R2_ACCOUNT_ID");
  if (!accountId) {
    throw new Error("Cloudflare R2 is not configured");
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Client(): S3Client {
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function validateR2PublicBaseUrl(): string | null {
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!publicBaseUrl) return "R2_PUBLIC_BASE_URL is missing";

  try {
    const hostname = new URL(publicBaseUrl).hostname;
    if (hostname.endsWith(".r2.cloudflarestorage.com")) {
      return "R2_PUBLIC_BASE_URL must be the public bucket URL (pub-….r2.dev or your custom domain), not the S3 API endpoint.";
    }
  } catch {
    return "R2_PUBLIC_BASE_URL is not a valid URL";
  }

  return null;
}

export function isSafeR2ObjectKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.startsWith("/")) return false;
  return key.includes("/");
}

export function isR2PublicMediaUrl(publicUrl: string): boolean {
  try {
    const parsed = new URL(publicUrl);
    if (parsed.protocol !== "https:") return false;

    if (parsed.hostname.endsWith(".r2.dev")) {
      return true;
    }

    const publicBaseUrl = getR2PublicBaseUrl();
    if (publicBaseUrl) {
      const base = publicBaseUrl.replace(/\/$/, "");
      return publicUrl.startsWith(`${base}/`);
    }
  } catch {
    return false;
  }

  return false;
}

export async function uploadPhotoToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const bucket = readEnv("R2_BUCKET_NAME");
  const publicBaseUrl = getR2PublicBaseUrl();

  if (!bucket || !publicBaseUrl) {
    throw new Error("Cloudflare R2 bucket or public URL is not configured");
  }

  const publicUrlError = validateR2PublicBaseUrl();
  if (publicUrlError) {
    throw new Error(publicUrlError);
  }

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${key}`;
}

/** Best-effort delete; missing keys are ignored. */
export async function deleteR2Objects(keys: string[]): Promise<void> {
  const bucket = readEnv("R2_BUCKET_NAME");
  if (!bucket) return;

  const client = getR2Client();
  await Promise.all(
    keys.filter(isSafeR2ObjectKey).map(async (key) => {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
      } catch {
        // Object may not exist (e.g. previous extension variant).
      }
    })
  );
}

/** Known R2 prefixes served through /api/hub-photo when the bucket is private. */
const R2_PROXY_KEY_PREFIXES = ["avatars/", "city-heroes/"] as const;

function isR2ProxyKey(key: string): boolean {
  return R2_PROXY_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) && isSafeR2ObjectKey(key);
}

/** Parse object key from a public R2 URL (works on client for pub-*.r2.dev links). */
export function parseR2ObjectKey(publicUrl: string): string | null {
  try {
    if (!publicUrl.startsWith("/")) {
      const key = decodeURIComponent(new URL(publicUrl).pathname.replace(/^\//, ""));
      if (isR2ProxyKey(key)) {
        return key;
      }
    }
  } catch {
    // fall through to hostname-based parsing
  }

  if (!isR2PublicMediaUrl(publicUrl)) return null;

  try {
    const key = decodeURIComponent(new URL(publicUrl).pathname.replace(/^\//, ""));
    return isSafeR2ObjectKey(key) ? key : null;
  } catch {
    return null;
  }
}

export async function getR2Object(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const bucket = readEnv("R2_BUCKET_NAME");
  if (!bucket || !isSafeR2ObjectKey(key)) {
    return null;
  }

  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) return null;

    const bytes = await response.Body.transformToByteArray();
    return {
      body: bytes,
      contentType: response.ContentType ?? "image/webp",
    };
  } catch {
    return null;
  }
}

export function getR2PublicHostname(): string | null {
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!publicBaseUrl) return null;

  try {
    return new URL(publicBaseUrl).hostname;
  } catch {
    return null;
  }
}

export function hubPhotoProxyPath(key: string): string {
  return `/api/hub-photo?key=${encodeURIComponent(key)}`;
}
