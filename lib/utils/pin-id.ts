const OPTIMISTIC_PIN_ID_PREFIX = "optimistic-";

/** Client-only placeholder ids from optimistic Add-modal saves — never send to the API. */
export function isPersistedPinId(id: string): boolean {
  return !id.startsWith(OPTIMISTIC_PIN_ID_PREFIX);
}

export function filterPersistedPinIds(ids: Iterable<string>): string[] {
  return [...ids].filter(isPersistedPinId);
}
