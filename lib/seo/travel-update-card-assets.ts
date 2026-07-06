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
}): Promise<{ avatarUrl: string | null }> {
  const siteUrl = getSiteUrl();

  const avatarUrl = await loadProxiedOgImageDataUrl(
    absoluteAssetUrl(options.avatarSource, siteUrl),
    options.assetOrigin,
    {
      width: 336,
      height: 336,
    }
  );

  return { avatarUrl };
}
