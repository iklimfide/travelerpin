import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "app", "icon.svg"));
const publicDir = join(root, "public");
const appDir = join(root, "app");

const outputs = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
];

for (const [filename, size] of outputs) {
  await sharp(svg).resize(size, size).png().toFile(join(publicDir, filename));
  console.log(`Wrote public/${filename}`);
}

const faviconIco = await sharp(svg).resize(32, 32).toBuffer();
await sharp(faviconIco).toFile(join(publicDir, "favicon.ico"));
await sharp(faviconIco).toFile(join(appDir, "favicon.ico"));
console.log("Wrote public/favicon.ico");
console.log("Wrote app/favicon.ico");
