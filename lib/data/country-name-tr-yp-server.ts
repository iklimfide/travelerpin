import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setYpCountryNameTrRuntime } from "@/lib/data/country-name-tr-yp";

const FILE_PATH = path.join(process.cwd(), "lib/data/country-name-tr-yp.json");

/** Rewrite sync JSON from DB rows so getCountryName picks up YP overrides after save. */
export async function writeYpCountryNameTrFile(
  rows: Array<{ country_code: string; name_tr: string }>
): Promise<void> {
  const next: Record<string, string> = {};
  for (const row of rows) {
    const code = row.country_code.trim().toUpperCase();
    const name = row.name_tr.trim();
    if (code.length === 2 && name) next[code] = name;
  }
  const sorted = Object.fromEntries(
    Object.entries(next).sort(([a], [b]) => a.localeCompare(b))
  );
  setYpCountryNameTrRuntime(sorted);
  await writeFile(FILE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

export async function readYpCountryNameTrFile(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}
