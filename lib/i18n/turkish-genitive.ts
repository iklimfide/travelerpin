import type { Locale } from "@/lib/i18n/config";

const TR_VOWELS = new Set(["a", "e", "ı", "i", "o", "ö", "u", "ü"]);

/** Four-way genitive: in / ın / ün / un (from the last vowel in the word). */
const GENITIVE_BY_VOWEL: Record<string, string> = {
  e: "in",
  i: "in",
  a: "ın",
  ı: "ın",
  ö: "ün",
  ü: "ün",
  o: "un",
  u: "un",
};

function lastCharLower(value: string): string {
  return value.slice(-1).toLocaleLowerCase("tr-TR");
}

function lastVowelLower(value: string): string | null {
  for (let i = value.length - 1; i >= 0; i--) {
    const ch = value[i]!.toLocaleLowerCase("tr-TR");
    if (TR_VOWELS.has(ch)) return ch;
  }
  return null;
}

/**
 * Turkish proper-name genitive for UI titles: Ali'nin, Ayşe'nin, GÜVENÇ'in, Oğuz'un.
 * Vowel-final names take a buffer n ('nin / 'nın / …).
 */
export function turkishGenitiveName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  const endsWithVowel = TR_VOWELS.has(lastCharLower(trimmed));
  const harmony = GENITIVE_BY_VOWEL[lastVowelLower(trimmed) ?? ""] ?? "in";
  const suffix = endsWithVowel ? `n${harmony}` : harmony;
  return `${trimmed}'${suffix}`;
}

/** Name slot for "{name}'s Travel Map" / "{name} Seyahat Haritası" templates. */
export function mapTitleOwnerName(displayName: string, locale: Locale): string {
  return locale === "tr" ? turkishGenitiveName(displayName) : displayName;
}
