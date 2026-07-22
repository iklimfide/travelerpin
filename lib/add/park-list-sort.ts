/** YP popular → alphabetical (tr). */
export function compareParksForAddModal<
  T extends { name: string; highlighted?: boolean },
>(a: T, b: T): number {
  const aPopular = Boolean(a.highlighted);
  const bPopular = Boolean(b.highlighted);
  if (aPopular !== bPopular) return aPopular ? -1 : 1;

  return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
}

export function sortParksForAddModal<
  T extends { name: string; highlighted?: boolean },
>(parks: T[]): T[] {
  return [...parks].sort(compareParksForAddModal);
}
