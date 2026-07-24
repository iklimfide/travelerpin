export type ModalBrowseCity = {
  countryCode: string;
  name: string;
};

export async function fetchModalBrowseCities(limit = 40): Promise<ModalBrowseCity[]> {
  const response = await fetch(`/api/cities/browse?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as { cities?: ModalBrowseCity[] };
  return data.cities ?? [];
}
