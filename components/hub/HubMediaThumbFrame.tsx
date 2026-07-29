"use client";

import type { ReactNode, MouseEvent } from "react";
import { Link } from "@/lib/i18n/navigation";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";

type HubMediaThumbFrameProps = {
  pin: HubTravelerPin;
  children: ReactNode;
  linkToProfile?: boolean;
};

function stopBubble(event: MouseEvent) {
  event.stopPropagation();
}

export function HubMediaThumbFrame({
  pin,
  children,
  linkToProfile = true,
}: HubMediaThumbFrameProps) {
  const name = pin.displayName?.trim() || `@${pin.username}`;

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
