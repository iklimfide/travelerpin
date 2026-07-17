import ypCountryNameTr from "@/lib/data/country-name-tr-yp.json";

/** In-process overrides so server saves apply without waiting for module reload. */
let runtimeOverrides: Record<string, string> | null = null;

function activeMap(): Readonly<Record<string, string>> {
  return runtimeOverrides ?? (ypCountryNameTr as Record<string, string>);
}

/** Sync snapshot for client + server (bundled JSON + optional runtime map). */
export function getYpCountryNameTrMap(): Readonly<Record<string, string>> {
  return activeMap();
}

export function getYpCountryNameTr(code: string): string | undefined {
  const value = activeMap()[code.toUpperCase()];
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Server-only: update in-memory map after writing the JSON file. */
export function setYpCountryNameTrRuntime(map: Record<string, string>): void {
  runtimeOverrides = map;
}
