export const PROFILE_OG_CAPTURE_ID = "profile-og-capture";

export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;
const OG_BACKGROUND = "#f4f7fb";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load capture image"));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image file"))),
      "image/png",
      0.92
    );
  });
}

/** Fit a mobile profile screenshot into the 1200×630 OG frame (top crop, letterbox if needed). */
async function fitMobileProfileToOgPng(dataUrl: string): Promise<Blob> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OG_CARD_WIDTH;
  canvas.height = OG_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create OG canvas");
  }

  context.fillStyle = OG_BACKGROUND;
  context.fillRect(0, 0, OG_CARD_WIDTH, OG_CARD_HEIGHT);

  // Scale mobile profile to OG width, keep the top of the profile (hero + card + map).
  const scale = OG_CARD_WIDTH / image.width;
  const sourceHeight = Math.min(image.height, OG_CARD_HEIGHT / scale);

  context.drawImage(
    image,
    0,
    0,
    image.width,
    sourceHeight,
    0,
    0,
    OG_CARD_WIDTH,
    sourceHeight * scale
  );

  return canvasToBlob(canvas);
}

/**
 * Screenshot the owner's profile for the link preview card.
 * Prefers the dedicated OG host (own profile only), then the username-scoped live region.
 */
export async function captureProfileOgCard(username: string): Promise<Blob> {
  const { profileStoryCaptureId } = await import("@/lib/client/capture-profile-story-card");
  const legacyHost = document.getElementById(PROFILE_OG_CAPTURE_ID);
  const liveProfile = document.getElementById(profileStoryCaptureId(username));
  // Never fall back to another profile's capture region (e.g. homepage Jennifer demo).
  const element = legacyHost ?? liveProfile;

  if (!element) {
    throw new Error("missing-capture-region");
  }

  if (element === liveProfile) {
    liveProfile.scrollIntoView({ block: "start", behavior: "instant" });
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250));

  const { toPng } = await import("html-to-image");
  const isLive = element === liveProfile;
  const dataUrl = await toPng(element, {
    pixelRatio: isLive ? 2 : 1,
    cacheBust: true,
    backgroundColor: OG_BACKGROUND,
    width: isLive ? undefined : OG_CARD_WIDTH,
    height: isLive ? undefined : OG_CARD_HEIGHT,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return node.dataset.storyExclude === undefined;
    },
  });

  return fitMobileProfileToOgPng(dataUrl);
}
