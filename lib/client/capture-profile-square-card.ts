import { captureElementToPng } from "@/lib/client/prepare-html-capture";
import { renderFramedShareCardPng } from "@/lib/client/share-card-canvas-footer";
import { withShareMapShowcase } from "@/lib/client/share-map-showcase";

export const PROFILE_SQUARE_CAPTURE_ID = "profile-square-capture";

export function profileSquareCaptureId(username: string): string {
  return `${PROFILE_SQUARE_CAPTURE_ID}-${username.trim().toLowerCase()}`;
}

const SQUARE_SIZE = 1080;
const SQUARE_BACKGROUND = "#f4f7fb";
const SQUARE_FOOTER_HEIGHT = 72;

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

  return withShareMapShowcase(async () => {
    element.classList.add("profile-capture-active");
    try {
      const dataUrl = await captureElementToPng(element, {
        backgroundColor: SQUARE_BACKGROUND,
        filter: (node) => !isCaptureExcluded(node),
      });

      return renderFramedShareCardPng(
        dataUrl,
        SQUARE_SIZE,
        SQUARE_SIZE,
        SQUARE_FOOTER_HEIGHT
      );
    } finally {
      element.classList.remove("profile-capture-active");
    }
  });
}
