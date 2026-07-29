"use client";

import type { ReactNode, MouseEvent } from "react";
import { Link } from "@/lib/i18n/navigation";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";

type HubMediaThumbFrameProps = {
  pin: HubTravelerPin;
  children: ReactNode;
  linkToProfile?: boolean;
  /** City/country hub: show who uploaded. Profile gallery: off (context is already one traveler). */
  showUploader?: boolean;
};

function stopBubble(event: MouseEvent) {
  event.stopPropagation();
}

export function HubMediaThumbFrame({
  pin,
  children,
  linkToProfile = true,
  showUploader = true,
}: HubMediaThumbFrameProps) {
  const name = pin.displayName?.trim() || `@${pin.username}`;

  if (!showUploader) {
    return <div className="city-page__hub-media-thumb-frame">{children}</div>;
  }

  const badge = linkToProfile ? (
    <Link
      href={pin.profilePath}
      className="city-page__hub-media-uploader"
      prefetch={false}
      onClick={stopBubble}
      onMouseDown={stopBubble}
    >
      {name}
    </Link>
  ) : (
    <span className="city-page__hub-media-uploader city-page__hub-media-uploader--static">{name}</span>
  );

  return (
    <div className="city-page__hub-media-thumb-frame">
      {children}
      {badge}
    </div>
  );
}
