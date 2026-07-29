import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function extractInstagramZipToTemp(zipPath: string): Promise<string> {
  const absZip = path.resolve(zipPath);
  if (!fs.existsSync(absZip)) {
    throw new Error("ZIP file not found");
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tp-instagram-import-"));
  const dest = path.join(tempRoot, "export");

  fs.mkdirSync(dest, { recursive: true });

  try {
    await execFileAsync("tar", ["-xf", absZip, "-C", dest], {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
    });
  } catch (err) {
    removeTempDir(tempRoot);
    throw err instanceof Error ? err : new Error("Failed to extract ZIP (tar)");
  }

  const exportRoot = detectExportRoot(dest);
  return exportRoot;
}

/** Returns the directory that contains `media/` or activity JSON. */
function detectExportRoot(extractDir: string): string {
  const markers = [
    path.join(extractDir, "your_instagram_activity"),
    path.join(extractDir, "media"),
    extractDir,
  ];

  for (const candidate of markers) {
    if (fs.existsSync(path.join(extractDir, "your_instagram_activity", "media"))) {
      return extractDir;
    }
  }

  const entries = fs.readdirSync(extractDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (entries.length === 1) {
    const nested = path.join(extractDir, entries[0].name);
    if (
      fs.existsSync(path.join(nested, "your_instagram_activity")) ||
      fs.existsSync(path.join(nested, "media"))
    ) {
      return nested;
    }
  }

  for (const candidate of markers) {
    if (fs.existsSync(candidate)) return extractDir;
  }

  return extractDir;
}

export function removeTempDir(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

export function tempDirParent(exportRoot: string): string {
  let current = exportRoot;
  while (current && path.basename(current) !== "export") {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (path.basename(current) === "export") {
    return path.dirname(current);
  }
  return exportRoot;
}
