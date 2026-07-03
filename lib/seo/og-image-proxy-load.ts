function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Server-side fetch of /api/og-asset, inlined before ImageResponse (edge-safe). */
export async function loadProxiedOgImageDataUrl(
  source: string | null,
  assetOrigin: string,
  size?: { width?: number; height?: number }
): Promise<string | null> {
  if (!source) return null;

  try {
    const params = new URLSearchParams({ src: source });
    if (size?.width) params.set("w", String(size.width));
    if (size?.height) params.set("h", String(size.height));

    const response = await fetch(`${assetOrigin}/api/og-asset?${params}`, {
      // /api/og-asset already sends long Cache-Control; reuse across OG renders.
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) return null;

    return `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
  } catch {
    return null;
  }
}
