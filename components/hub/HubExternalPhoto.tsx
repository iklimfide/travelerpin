type HubExternalPhotoProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

/** Plain img — src must be resolved on the server (see hubPhotoDisplayUrl). */
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

export function hubPinPhotoSrc(pin: {
  mediaDisplayUrl: string | null;
  photoUrl?: string | null;
  mediaUrl: string | null;
}): string | null {
  return pin.mediaDisplayUrl ?? pin.photoUrl ?? pin.mediaUrl;
}
