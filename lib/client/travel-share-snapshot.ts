export async function saveTravelShareSnapshot(): Promise<boolean> {
  try {
    const response = await fetch("/api/me/travel-share-snapshot", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Save snapshot, then refresh on the next tick. */
export async function finalizeTravelShare(
  refresh: () => void,
  _username: string
): Promise<void> {
  await saveTravelShareSnapshot();
  queueMicrotask(() => refresh());
}
