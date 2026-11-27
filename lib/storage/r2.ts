import {
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  getR2PublicBaseUrl,
  isSafeR2ObjectKey,
  validateR2PublicBaseUrl,
} from "@/lib/storage/r2-public";

export {
  getR2PublicBaseUrl,
  getR2PublicHostname,
  hubPhotoProxyPath,
  isR2PublicMediaUrl,
  isSafeR2ObjectKey,
  parseHubPhotoProxyRequest,
  parseR2ObjectKey,
  publicR2ObjectUrl,
  readMediaCacheBuster,
  validateR2PublicBaseUrl,
} from "@/lib/storage/r2-public";

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

export async function getR2ObjectStream(
  key: string
): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
} | null> {
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

    return {
      body: response.Body.transformToWebStream(),
      contentType: response.ContentType ?? "image/webp",
      contentLength:
        typeof response.ContentLength === "number" ? response.ContentLength : null,
    };
  } catch {
    return null;
  }
}

export async function getR2Object(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const streamed = await getR2ObjectStream(key);
  if (!streamed) return null;

  const bytes = new Uint8Array(await new Response(streamed.body).arrayBuffer());
  return {
    body: bytes,
    contentType: streamed.contentType,
  };
}
