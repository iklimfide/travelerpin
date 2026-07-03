import { getR2PublicBaseUrl } from "@/lib/storage/r2";

export function profileOgSnapshotKey(username: string): string {
  return `og-snapshots/${username.trim().toLowerCase()}.png`;
}

export function profileOgSnapshotPublicUrl(username: string): string | null {
  const base = getR2PublicBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${profileOgSnapshotKey(username)}`;
}

export async function fetchProfileOgSnapshot(
  username: string
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const url = profileOgSnapshotPublicUrl(username);
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const body = await response.arrayBuffer();
    if (body.byteLength === 0) return null;

    return {
      body,
      contentType: response.headers.get("content-type") ?? "image/png",
    };
  } catch {
    return null;
  }
}
