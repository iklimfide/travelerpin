import { InstagramIcon } from "@/components/share/SharePlatformIcons";

type InstagramMemoryThumbProps = {
  displayName: string;
};

export function InstagramMemoryThumb({ displayName }: InstagramMemoryThumbProps) {
  return (
    <span className="city-page__memory-thumb-instagram" aria-hidden>
      <InstagramIcon className="h-7 w-7" />
      <span>{displayName}</span>
    </span>
  );
}
