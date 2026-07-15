import { captureElementToPng } from "@/lib/client/prepare-html-capture";
import { renderFramedShareCardPng } from "@/lib/client/share-card-canvas-footer";
import { withShareMapShowcase } from "@/lib/client/share-map-showcase";

export const PROFILE_STORY_CAPTURE_ID = "profile-story-capture";

/** Username-scoped so homepage demo (Jennifer) never shadows another profile. */
export function profileStoryCaptureId(username: string): string {
  return `${PROFILE_STORY_CAPTURE_ID}-${username.trim().toLowerCase()}`;
}

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_BACKGROUND = "#f4f7fb";
const STORY_FOOTER_HEIGHT = 80;

/** Screenshot the live profile header (hero + card + map) for a 9:16 story PNG. */
export async function captureProfileStoryCard(username: string): Promise<Blob> {
  const element = document.getElementById(profileStoryCaptureId(username));
  if (!element) {
    throw new Error("missing-capture-region");
  }

  return withShareMapShowcase(async () => {
    element.classList.add("profile-capture-active");
    try {
      const dataUrl = await captureElementToPng(element, {
        backgroundColor: STORY_BACKGROUND,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          return node.dataset.storyExclude === undefined;
        },
      });

      return renderFramedShareCardPng(
        dataUrl,
        STORY_WIDTH,
        STORY_HEIGHT,
        STORY_FOOTER_HEIGHT
      );
    } finally {
      element.classList.remove("profile-capture-active");
    }
  });
}
