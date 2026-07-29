/**
 * Patches frozen Jennifer stats onto public/images/og-share-card.png.
 * Coordinates target the 2806×1504 master asset.
 *
 * Prefer updating the source design export when possible; this script is a fallback.
 * Values must match `lib/data/jennifer-marketing-stats.ts`.
 *
 *   node scripts/patch-og-share-card.mjs
 */
import sharp from "sharp";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const INPUT = join(ROOT, "public/images/og-share-card.png");
const OUTPUT = join(ROOT, "public/images/og-share-card.png");
const TEMP = join(ROOT, "public/images/og-share-card.patched.png");

const COUNTRIES = 41;
const WORLD_PERCENT = Math.round((COUNTRIES / 195) * 100);
const PINNED_LABEL = `${COUNTRIES} of 195 countries pinned`;

function buildOverlaySvg() {
  const trackX = 2234;
  const trackY = 928;
  const trackW = 478;
  const trackH = 30;
  const fillW = Math.round((trackW * WORLD_PERCENT) / 100);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2806" height="1504">
  <rect x="1172" y="838" width="108" height="72" fill="#ffffff"/>
  <text x="1178" y="902" font-family="Arial, Helvetica, sans-serif" font-size="84" font-weight="900" fill="#0f172a">${COUNTRIES}</text>

  <rect x="2075" y="848" width="735" height="188" fill="#ffffff"/>
  <text x="2218" y="902" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="900" fill="#2563eb">${WORLD_PERCENT}%</text>
  <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${trackH}" fill="#e2e8f0" rx="15"/>
  <rect x="${trackX}" y="${trackY}" width="${fillW}" height="${trackH}" fill="#2563eb" rx="15"/>
  <text x="2232" y="998" font-family="Arial, Helvetica, sans-serif" font-size="33" font-weight="500" fill="#64748b">${PINNED_LABEL}</text>
</svg>`);
}

async function main() {
  const overlay = buildOverlaySvg();
  await sharp(INPUT)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(TEMP);

  const { copyFile, unlink } = await import("node:fs/promises");
  await copyFile(TEMP, OUTPUT);
  await unlink(TEMP).catch(() => {});

  console.log(`Patched ${OUTPUT} (${COUNTRIES} countries, ${WORLD_PERCENT}%, ${PINNED_LABEL})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
