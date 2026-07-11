"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const EMBED_PARAM = "__mobile_preview";

/** Marks the iframe document so preview embed fills the device frame height. */
export function MobilePreviewEmbedRoot() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get(EMBED_PARAM) === "1";

  useEffect(() => {
    if (!isEmbed) return;

    document.documentElement.dataset.tpMobilePreviewEmbed = "1";
    return () => {
      delete document.documentElement.dataset.tpMobilePreviewEmbed;
    };
  }, [isEmbed]);

  return null;
}
