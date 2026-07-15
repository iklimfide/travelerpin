/** Capital → YP popular → alphabetical (tr). */
export function compareCitiesForAddModal<
  T extends { name: string; highlighted?: boolean; isCapital?: boolean },
>(a: T, b: T): number {
  const aCapital = Boolean(a.isCapital);
  const bCapital = Boolean(b.isCapital);
  if (aCapital !== bCapital) return aCapital ? -1 : 1;

  const aPopular = Boolean(a.highlighted);
  const bPopular = Boolean(b.highlighted);
  if (aPopular !== bPopular) return aPopular ? -1 : 1;

  return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
}

export function sortCitiesForAddModal<
  T extends { name: string; highlighted?: boolean; isCapital?: boolean },
>(cities: T[]): T[] {
  return [...cities].sort(compareCitiesForAddModal);
}
