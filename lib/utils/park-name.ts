import { formatKnownPlaceName } from "@/lib/utils/city-name";

/** Soft cap for list labels; full name stays on `title` / in storage. */
const SHORT_PARK_LABEL_MAX = 42;

/**
 * Institutional / purpose filler that makes botanical & conservation names
 * unreadable in lists (kept in the stored/canonical name).
 */
const FILLER_PHRASES: RegExp[] = [
  /\s+per\s+la\s+conservazione\s+della\s+biodiversit[aà]/giu,
  /\s+per\s+la\s+conservazione\s+della\s+natura/giu,
  /\s+per\s+la\s+conservazione\s+delle?\s+\w+/giu,
  /\s+for\s+the\s+conservation\s+of\s+(?:biodiversity|nature)/giu,
  /\s+pour\s+la\s+conservation\s+de\s+la\s+biodiversit[eé]/giu,
  /\s+para\s+la\s+conservaci[oó]n\s+de\s+la\s+biodiversidad/giu,
  /\s+zur\s+erhaltung\s+der\s+biodiversit[aä]t/giu,
  /\s+dedicated\s+to(?:\s+the)?/giu,
  /\s+in\s+memory\s+of/giu,
  /\s+in\s+memoria\s+di/giu,
];

/** Leading type labels; only strip when a distinctive name remains after. */
const LEADING_TYPE_PREFIXES: RegExp[] = [
  /^Giardino\s+Botanico\s+Alpino(?:\s+|[,:\-–—]\s*)/iu,
  /^Giardino\s+Botanico(?:\s+|[,:\-–—]\s*)/iu,
  /^Orto\s+Botanico(?:\s+|[,:\-–—]\s*)/iu,
  /^Jardin\s+Botanique(?:\s+|[,:\-–—]\s*)/iu,
  /^Jard[ií]n\s+Bot[aá]nico(?:\s+|[,:\-–—]\s*)/iu,
  /^Jardim\s+Bot[aâ]nico(?:\s+|[,:\-–—]\s*)/iu,
  /^Botanischer\s+Garten(?:\s+|[,:\-–—]\s*)/iu,
  /^(?:The\s+)?Botanical\s+Gardens?(?:\s+(?:of\s+)|[,:\-–—]\s*|\s+)/iu,
  /^(?:The\s+)?Botanic\s+Gardens?(?:\s+(?:of\s+)|[,:\-–—]\s*|\s+)/iu,
];

/** Mid-string type labels that add little once a garden/park word remains. */
const MID_TYPE_LABELS: RegExp[] = [
  /\s+botanical\s+gardens?\s+/giu,
  /\s+botanic\s+gardens?\s+/giu,
  /\s+giardino\s+botanico(?:\s+alpino)?\s+/giu,
  /\s+orto\s+botanico\s+/giu,
  /\s+jardin\s+botanique\s+/giu,
  /\s+jard[ií]n\s+bot[aá]nico\s+/giu,
  /\s+botanischer\s+garten\s+/giu,
];

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function softTruncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace >= Math.floor(max * 0.55) ? slice.slice(0, lastSpace) : slice;
  return `${collapseSpaces(cut)}…`;
}

/**
 * Display-only short label for park lists. Does not change the stored/canonical name.
 * Prefer `title={fullName}` alongside this in UI.
 */
export function shortParkLabel(name: string, maxLength = SHORT_PARK_LABEL_MAX): string {
  const full = formatKnownPlaceName(name);
  if (!full) return full;

  let short = full;
  for (const pattern of FILLER_PHRASES) {
    short = short.replace(pattern, " ");
  }
  for (const pattern of MID_TYPE_LABELS) {
    short = short.replace(pattern, " ");
  }
  short = collapseSpaces(short);

  // "Giardino Montano … Proper Name" — drop the middle descriptor when a garden
  // word + trailing proper name remain (keeps "Giardino Ruggero Tomaselli").
  short = short.replace(
    /^(Giardino|Orto|Jardin|Jardín|Jardim|Garden)\s+Montano\s+(?=\p{Lu})/u,
    "$1 "
  );
  short = collapseSpaces(short);

  for (const pattern of LEADING_TYPE_PREFIXES) {
    const stripped = collapseSpaces(short.replace(pattern, ""));
    if (stripped.length >= 2) {
      short = stripped;
      break;
    }
  }

  if (!short) return full;
  if (short === full && full.length <= maxLength) return full;

  return softTruncate(short, maxLength);
}
