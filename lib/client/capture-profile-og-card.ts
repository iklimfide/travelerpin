export const PROFILE_OG_CAPTURE_ID = "profile-og-capture";

export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

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

async function ensureOgDimensions(dataUrl: string): Promise<Blob> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OG_CARD_WIDTH;
  canvas.height = OG_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create OG canvas");
  }

  context.drawImage(image, 0, 0, OG_CARD_WIDTH, OG_CARD_HEIGHT);
  return canvasToBlob(canvas);
}

/** Screenshot the hidden horizontal OG card region (1200×630, edge-to-edge). */
export async function captureProfileOgCard(): Promise<Blob> {
  const element = document.getElementById(PROFILE_OG_CAPTURE_ID);
  if (!element) {
    throw new Error("missing-capture-region");
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250));

  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    pixelRatio: 1,
    width: OG_CARD_WIDTH,
    height: OG_CARD_HEIGHT,
    cacheBust: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return node.dataset.storyExclude === undefined;
    },
  });

  return ensureOgDimensions(dataUrl);
}
