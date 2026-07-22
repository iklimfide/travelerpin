import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";

export async function saveTravelShareSnapshot(): Promise<boolean> {
  try {
    const response = await fetch("/api/me/travel-share-snapshot", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Save snapshot, then refresh profile caches client-side (no RSC reload). */
export async function finalizeTravelShare(username?: string | null): Promise<void> {
  await saveTravelShareSnapshot();
  notifyProfileDataChanged(username);
}
