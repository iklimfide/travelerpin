import { captureElementToPng } from "@/lib/client/prepare-html-capture";
import { renderFramedShareCardPng } from "@/lib/client/share-card-canvas-footer";

export const PROFILE_NEXT_ROUTE_CAPTURE_ID = "profile-next-route-capture";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const CARD_BACKGROUND = "#f4f7fb";
const STORY_FOOTER_HEIGHT = 80;

function isCaptureExcluded(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.dataset.routeCaptureExclude !== undefined;
}

/** Move the live card off-screen so grid/layout parents do not distort capture size. */
function mountCaptureStage(element: HTMLElement): () => void {
  const parent = element.parentElement;
  const anchor = document.createComment("profile-next-route-capture-anchor");
  parent?.insertBefore(anchor, element);

  const stage = document.createElement("div");
  stage.className = "profile-next-route-capture-stage";
  document.body.appendChild(stage);
  stage.appendChild(element);

  return () => {
    parent?.insertBefore(element, anchor);
    anchor.remove();
    stage.remove();
  };
}

/** Screenshot the Next Route card for a 9:16 story share PNG. */
export async function captureProfileNextRouteCard(): Promise<Blob> {
  const element = document.getElementById(PROFILE_NEXT_ROUTE_CAPTURE_ID);
  if (!element) {
    throw new Error("missing-capture-region");
  }

  const unmountStage = mountCaptureStage(element);
  element.classList.add("profile-capture-active");

  try {
    void element.offsetWidth;

    const dataUrl = await captureElementToPng(element, {
      backgroundColor: CARD_BACKGROUND,
      skipScroll: true,
      filter: (node) => !isCaptureExcluded(node),
    });

    return renderFramedShareCardPng(
      dataUrl,
      STORY_WIDTH,
      STORY_HEIGHT,
      STORY_FOOTER_HEIGHT
    );
  } finally {
    element.classList.remove("profile-capture-active");
    unmountStage();
  }
}

export function isProfileNextRouteCaptureReady(): boolean {
  return Boolean(
    document.querySelector(`#${PROFILE_NEXT_ROUTE_CAPTURE_ID}[data-route-capture-ready]`)
  );
}

/** Capture the route card and trigger a PNG download in the browser. */
export async function downloadProfileNextRouteCardPng(username: string): Promise<void> {
  if (!isProfileNextRouteCaptureReady()) {
    throw new Error("missing-capture-region");
  }

  const blob = await captureProfileNextRouteCard();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `travelerpin-next-route-${username.trim().toLowerCase()}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}
