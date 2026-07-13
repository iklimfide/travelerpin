/**
 * Copy SVG flags from country-flag-icons into public/flags for self-hosted serving.
 * Run via postinstall and before production build.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules/country-flag-icons/3x2");
const dest = path.join(root, "public/flags");

if (!fs.existsSync(src)) {
  console.warn("country-flag-icons not installed — skipping flag copy");
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });

let copied = 0;
for (const file of fs.readdirSync(src)) {
  if (!file.endsWith(".svg")) continue;
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  copied++;
}

console.log(`Copied ${copied} country flags to public/flags`);

const supplementalSrc = path.join(root, "assets/country-flags");
if (fs.existsSync(supplementalSrc)) {
  for (const file of fs.readdirSync(supplementalSrc)) {
    if (!file.endsWith(".svg")) continue;
    fs.copyFileSync(path.join(supplementalSrc, file), path.join(dest, file));
    copied++;
  }
  console.log(`Included supplemental flags from assets/country-flags`);
}
