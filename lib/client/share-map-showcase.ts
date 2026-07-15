/** Dispatched around share-card PNG capture so the profile map can show a fuller fill. */
export const SHARE_MAP_SHOWCASE_START_EVENT = "tp:share-map-showcase-start";
export const SHARE_MAP_SHOWCASE_END_EVENT = "tp:share-map-showcase-end";

export function beginShareMapShowcase(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SHARE_MAP_SHOWCASE_START_EVENT));
}

export function endShareMapShowcase(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SHARE_MAP_SHOWCASE_END_EVENT));
}

/** Wait until the profile map has applied showcase fills, then settle paint. */
export async function waitForShareMapShowcasePaint(): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (document.querySelector('[data-share-map-showcase="1"]')) break;
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  await new Promise((resolve) => window.setTimeout(resolve, 160));
}

export async function withShareMapShowcase<T>(run: () => Promise<T>): Promise<T> {
  beginShareMapShowcase();
  try {
    await waitForShareMapShowcasePaint();
    return await run();
  } finally {
    endShareMapShowcase();
  }
}
