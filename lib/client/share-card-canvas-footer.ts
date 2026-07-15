import { BRAND } from "@/lib/constants";

/** Matches the deep navy used behind share hero / brand chrome. */
export const SHARE_CARD_FRAME_COLOR = "#0f172a";

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image file"))),
      "image/png",
      0.92
    );
  });
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/**
 * Places the captured profile onto a rounded dark frame with white travelerpin.com
 * footer text inside the frame. Outer corners are transparent so the card looks oval.
 */
export function composeShareCardOnFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  footerHeight: number,
  image: HTMLImageElement
): void {
  const inset = Math.max(28, Math.round(width * 0.038));
  const outerRadius = Math.max(48, Math.round(width * 0.072));
  const innerRadius = Math.max(22, Math.round(width * 0.032));
  const contentLeft = inset;
  const contentTop = inset;
  const contentWidth = width - inset * 2;
  const footerTop = height - inset - footerHeight;
  const contentHeight = Math.max(1, footerTop - contentTop);

  context.clearRect(0, 0, width, height);

  // Outer rounded navy frame (transparent outside the rounded rect)
  context.fillStyle = SHARE_CARD_FRAME_COLOR;
  roundedRectPath(context, 0, 0, width, height, outerRadius);
  context.fill();

  const scale = Math.min(contentWidth / image.width, contentHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = contentLeft + (contentWidth - drawWidth) / 2;
  const offsetY = contentTop + (contentHeight - drawHeight) / 2;

  context.save();
  roundedRectPath(context, offsetX, offsetY, drawWidth, drawHeight, innerRadius);
  context.clip();
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(footerHeight * 0.42)}px system-ui, -apple-system, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(BRAND.domain, width / 2, footerTop + footerHeight / 2);
}

export async function renderFramedShareCardPng(
  dataUrl: string,
  width: number,
  height: number,
  footerHeight: number
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load capture image"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create share card canvas");
  }

  composeShareCardOnFrame(context, width, height, footerHeight, image);
  return canvasToBlob(canvas);
}

/** @deprecated Prefer renderFramedShareCardPng — kept for any legacy callers. */
export function drawShareCardDomainFooter(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  footerHeight: number,
  _background: string
): void {
  const footerTop = height - footerHeight;
  context.fillStyle = SHARE_CARD_FRAME_COLOR;
  context.fillRect(0, footerTop, width, footerHeight);
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(footerHeight * 0.42)}px system-ui, -apple-system, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(BRAND.domain, width / 2, footerTop + footerHeight / 2);
}
