export const PROFILE_STORY_CAPTURE_ID = "profile-story-capture";

/** Username-scoped so homepage demo (Jennifer) never shadows another profile. */
export function profileStoryCaptureId(username: string): string {
  return `${PROFILE_STORY_CAPTURE_ID}-${username.trim().toLowerCase()}`;
}

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_BACKGROUND = "#f4f7fb";

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

async function fitCaptureToStoryPng(dataUrl: string): Promise<Blob> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create story canvas");
  }

  context.fillStyle = STORY_BACKGROUND;
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const scale = STORY_WIDTH / image.width;
  const scaledHeight = image.height * scale;

  if (scaledHeight > STORY_HEIGHT) {
    const sourceHeight = STORY_HEIGHT / scale;
    context.drawImage(
      image,
      0,
      0,
      image.width,
      sourceHeight,
      0,
      0,
      STORY_WIDTH,
      STORY_HEIGHT
    );
  } else {
    context.drawImage(image, 0, 0, STORY_WIDTH, scaledHeight);
  }

  return canvasToBlob(canvas);
}

/** Screenshot the live profile header (hero + card + map) for a 9:16 story PNG. */
export async function captureProfileStoryCard(username: string): Promise<Blob> {
  const element = document.getElementById(profileStoryCaptureId(username));
  if (!element) {
    throw new Error("missing-capture-region");
  }

  element.scrollIntoView({ block: "start", behavior: "instant" });
  await new Promise((resolve) => window.setTimeout(resolve, 200));

  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: STORY_BACKGROUND,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return node.dataset.storyExclude === undefined;
    },
  });

  return fitCaptureToStoryPng(dataUrl);
}
