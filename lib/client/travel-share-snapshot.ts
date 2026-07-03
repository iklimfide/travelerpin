export async function saveTravelShareSnapshot(): Promise<boolean> {
  try {
    const response = await fetch("/api/me/travel-share-snapshot", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
}

async function uploadProfileOgSnapshot(): Promise<boolean> {
  try {
    const { captureProfileOgCard } = await import("@/lib/client/capture-profile-og-card");
    const blob = await captureProfileOgCard();
    const formData = new FormData();
    formData.set("file", blob, "og.png");
    const response = await fetch("/api/me/profile-og-snapshot", {
      method: "POST",
      body: formData,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Save snapshot, upload OG card screenshot, then refresh on the next tick. */
export async function finalizeTravelShare(refresh: () => void): Promise<void> {
  await Promise.all([
    saveTravelShareSnapshot(),
    uploadProfileOgSnapshot().catch(() => false),
  ]);
  queueMicrotask(() => refresh());
}
