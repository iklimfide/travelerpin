"use client";

import { useTranslateCommon, useTranslateSettings } from "@/lib/i18n/client-messages";
import { clearAllSessionPageCaches } from "@/lib/client/session-page-cache";

export function ProfileAccountLogoutSection() {
  const tCommon = useTranslateCommon();
  const tSettings = useTranslateSettings();

  async function handleLogout() {
    clearAllSessionPageCaches();
    await fetch("/auth/signout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <section className="profile-section account-logout">
      <div className="profile-cta">
        <div>
          <p className="profile-cta-title">{tSettings("accountTitle")}</p>
          <p className="profile-cta-hint">{tSettings("logoutHint")}</p>
        </div>
        <div className="profile-cta-actions account-logout__actions">
          <button
            type="button"
            className="profile-cta-secondary"
            onClick={() => void handleLogout()}
          >
            {tCommon("logout")}
          </button>
        </div>
      </div>
    </section>
  );
}
