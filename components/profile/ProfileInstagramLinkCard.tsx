import { InstagramIcon } from "@/components/share/SharePlatformIcons";

type ProfileInstagramLinkCardProps = {
  displayName: string;
};

export function ProfileInstagramLinkCard({ displayName }: ProfileInstagramLinkCardProps) {
  return (
    <span className="profile-instagram-link-card">
      <InstagramIcon className="profile-instagram-link-card__icon" />
      <span className="profile-instagram-link-card__name">{displayName}</span>
    </span>
  );
}
