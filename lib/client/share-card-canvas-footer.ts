import { BRAND } from "@/lib/constants";

const FOOTER_COLOR = "#6b7c93";

export function drawShareCardDomainFooter(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  footerHeight: number,
  background: string
): void {
  const footerTop = height - footerHeight;

  context.fillStyle = background;
  context.fillRect(0, footerTop, width, footerHeight);

  context.fillStyle = FOOTER_COLOR;
  context.font = `700 ${Math.round(footerHeight * 0.42)}px system-ui, -apple-system, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(BRAND.domain, width / 2, footerTop + footerHeight / 2);
}
