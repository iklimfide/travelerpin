type HubExternalPhotoProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

/** Plain img — src should come from hubGalleryPhotoSrc / resolvePublicMediaImageUrl. */
export function HubExternalPhoto({
  src,
  alt,
  className,
  width,
  height,
}: HubExternalPhotoProps) {
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

export function isHubPhotoPin(pin: {
  mediaType: string | null;
  mediaUrl: string | null;
}): boolean {
  return Boolean(pin.mediaUrl) && pin.mediaType !== "instagram";
}

export { hubPinPhotoSrc } from "@/lib/storage/hub-photo-url";
