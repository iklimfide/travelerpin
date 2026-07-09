import type { Metadata } from "next";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfileSettingsPage() {
  return <SettingsPageClient />;
}
