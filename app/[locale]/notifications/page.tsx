import type { Metadata } from "next";
import { redirectTo } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  if (!supabase) {
    await redirectTo("/login");
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirectTo("/login");
    return null;
  }

  return null;
}
