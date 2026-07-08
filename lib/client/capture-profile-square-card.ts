import { captureElementToPng } from "@/lib/client/prepare-html-capture";
import { drawShareCardDomainFooter } from "@/lib/client/share-card-canvas-footer";

export const PROFILE_SQUARE_CAPTURE_ID = "profile-square-capture";

export function profileSquareCaptureId(username: string): string {
  return `${PROFILE_SQUARE_CAPTURE_ID}-${username.trim().toLowerCase()}`;
}

const SQUARE_SIZE = 1080;
const SQUARE_BACKGROUND = "#f4f7fb";
const SQUARE_FOOTER_HEIGHT = 72;

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

  const contentHeight = SQUARE_SIZE - SQUARE_FOOTER_HEIGHT;
  const scale = SQUARE_SIZE / image.width;
  const scaledHeight = image.height * scale;

  if (scaledHeight > contentHeight) {
    const fitScale = contentHeight / scaledHeight;
    const drawWidth = SQUARE_SIZE * fitScale;
    const drawHeight = contentHeight;
    const offsetX = (SQUARE_SIZE - drawWidth) / 2;
    context.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      offsetX,
      0,
      drawWidth,
      drawHeight
    );
  } else {
    const offsetY = (contentHeight - scaledHeight) / 2;
    context.drawImage(image, 0, offsetY, SQUARE_SIZE, scaledHeight);
  }

  drawShareCardDomainFooter(
    context,
    SQUARE_SIZE,
    SQUARE_SIZE,
    SQUARE_FOOTER_HEIGHT,
    SQUARE_BACKGROUND
  );

  return canvasToBlob(canvas);
}

function isCaptureExcluded(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.dataset.storyExclude !== undefined || node.classList.contains("profile-see-all");
}

/** Screenshot the profile summary + map for a 1:1 square PNG. */
export async function captureProfileSquareCard(
  _displayName: string,
  username: string
): Promise<Blob> {
  const element = document.getElementById(profileSquareCaptureId(username));
  if (!element) {
    throw new Error("missing-capture-region");
  }

  element.classList.add("profile-capture-active");
  try {
    const dataUrl = await captureElementToPng(element, {
      backgroundColor: SQUARE_BACKGROUND,
      filter: (node) => !isCaptureExcluded(node),
    });

    return fitCaptureToSquarePng(dataUrl);
  } finally {
    element.classList.remove("profile-capture-active");
  }
}
