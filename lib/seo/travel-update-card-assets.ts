import { loadProxiedOgImageDataUrl } from "@/lib/seo/og-image-proxy-load";
import { getSiteUrl } from "@/lib/seo/site";

function absoluteAssetUrl(url: string | null, siteUrl: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function loadTravelUpdateCardAssets(options: {
  assetOrigin: string;
  avatarSource: string | null;
  coverSource?: string | null;
}): Promise<{ avatarUrl: string | null; coverUrl: string | null }> {
  const siteUrl = getSiteUrl();

  const [avatarUrl, coverUrl] = await Promise.all([
    loadProxiedOgImageDataUrl(absoluteAssetUrl(options.avatarSource, siteUrl), options.assetOrigin, {
      width: 336,
      height: 336,
    }),
    loadProxiedOgImageDataUrl(
      absoluteAssetUrl(options.coverSource ?? null, siteUrl),
      options.assetOrigin,
      {
        width: 1080,
        height: 400,
      }
    ),
  ]);

  return { avatarUrl, coverUrl };
}
