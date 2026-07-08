const CAPTURE_SETTLE_MS = 450;

function waitForImage(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      resolve();
    };
    img.addEventListener("load", done);
    img.addEventListener("error", done);
  });
}

/** Give images, fonts, and the map a moment to settle before html-to-image runs. */
export async function prepareHtmlCapture(root: HTMLElement): Promise<void> {
  root.scrollIntoView({ block: "start", behavior: "auto" });

  const images = Array.from(root.querySelectorAll("img"));
  for (const img of images) {
    img.crossOrigin = "anonymous";
    img.loading = "eager";
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
  }

  if (typeof document.fonts?.ready !== "undefined") {
    await document.fonts.ready.catch(() => undefined);
  }

  await Promise.all(images.map((img) => waitForImage(img)));
  await new Promise((resolve) => window.setTimeout(resolve, CAPTURE_SETTLE_MS));
}

type CaptureToPngOptions = {
  backgroundColor: string;
  filter?: (node: HTMLElement) => boolean;
};

export async function captureElementToPng(
  element: HTMLElement,
  options: CaptureToPngOptions
): Promise<string> {
  await prepareHtmlCapture(element);

  const { toPng } = await import("html-to-image");
  const baseOptions = {
    cacheBust: true,
    backgroundColor: options.backgroundColor,
    skipFonts: true,
    fetchRequestInit: {
      mode: "cors" as RequestMode,
      credentials: "omit" as RequestCredentials,
    },
    filter: options.filter,
  };

  try {
    return await toPng(element, { ...baseOptions, pixelRatio: 2 });
  } catch {
    return await toPng(element, {
      ...baseOptions,
      pixelRatio: 1,
      skipAutoScale: true,
    });
  }
}
