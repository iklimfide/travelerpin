"use client";

import { clearAllSessionPageCaches } from "@/lib/client/session-page-cache";
import { translateCommon } from "@/lib/i18n/client-messages";

export function LogOutButtonInline() {
  const t = translateCommon;

  async function handleLogout() {
    clearAllSessionPageCaches();
    await fetch("/auth/signout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 sm:px-4 sm:py-2 sm:text-sm"
    >
      {t("logout")}
    </button>
  );
}
