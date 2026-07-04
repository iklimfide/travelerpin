import { formatMessage, profileMessages } from "@/lib/i18n/client-messages";

export const PROFILE_SQUARE_CAPTURE_ID = "profile-square-capture";

const SQUARE_SIZE = 1080;
const SQUARE_BACKGROUND = "#f4f7fb";

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

async function fitCaptureToSquarePng(dataUrl: string): Promise<Blob> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = SQUARE_SIZE;
  canvas.height = SQUARE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create square canvas");
  }

  context.fillStyle = SQUARE_BACKGROUND;
  context.fillRect(0, 0, SQUARE_SIZE, SQUARE_SIZE);

  const scale = SQUARE_SIZE / image.width;
  const scaledHeight = image.height * scale;

  if (scaledHeight > SQUARE_SIZE) {
    const sourceHeight = SQUARE_SIZE / scale;
    context.drawImage(
      image,
      0,
      0,
      image.width,
      sourceHeight,
      0,
      0,
      SQUARE_SIZE,
      SQUARE_SIZE
    );
  } else {
    const offsetY = (SQUARE_SIZE - scaledHeight) / 2;
    context.drawImage(image, 0, offsetY, SQUARE_SIZE, scaledHeight);
  }

  return canvasToBlob(canvas);
}

function isCaptureExcluded(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.dataset.storyExclude !== undefined || node.classList.contains("profile-see-all");
}

/** e.g. "Jennifer's Travel Map" */
export function buildSquareCaptureTitle(displayName: string): string {
  return formatMessage(profileMessages.travelDiaryTitle, { name: displayName });
}

/** Screenshot the world map panel with a personalized travel-map title. */
export async function captureProfileSquareCard(displayName: string): Promise<Blob> {
  const element = document.getElementById(PROFILE_SQUARE_CAPTURE_ID);
  if (!element) {
    throw new Error("missing-capture-region");
  }

  const titleEl = element.querySelector<HTMLElement>(".profile-section-title");
  const originalTitle = titleEl?.textContent ?? null;
  const captureTitle = buildSquareCaptureTitle(displayName);

  if (titleEl) {
    titleEl.textContent = captureTitle;
  }

  element.scrollIntoView({ block: "center", behavior: "instant" });
  await new Promise((resolve) => window.setTimeout(resolve, 200));

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: SQUARE_BACKGROUND,
      filter: (node) => !isCaptureExcluded(node),
    });

    return fitCaptureToSquarePng(dataUrl);
  } finally {
    if (titleEl && originalTitle !== null) {
      titleEl.textContent = originalTitle;
    }
  }
}
